import type { GeminiModelId, SeoResult, SeoSource } from "@naamkaran/shared";
import { resolveGeminiModelId } from "@naamkaran/shared";
import type { BrandSearchMode } from "../lib/gemini";
import { geminiFetch } from "../lib/gemini-throttle";
import { getGeminiGenerateUrl } from "../lib/gemini";

const LITE_TIMEOUT_MS = 60_000;
const DEEP_TIMEOUT_MS = 45_000;
const LITE_MAX_OUTPUT_TOKENS = 384;
const DEEP_MAX_OUTPUT_TOKENS = 512;
const BORDERLINE_LOW = 35;
const BORDERLINE_HIGH = 65;

interface GeminiSeoPayload {
  isExistingBrand: boolean;
  confidence: number;
  summary: string;
  competitors?: string[];
}

interface GroundingChunk {
  web?: { title?: string; uri?: string };
}

interface GeminiResponse {
  payload: GeminiSeoPayload;
  sources: SeoSource[];
}

function buildLitePrompt(name: string, category?: string): string {
  const context = category ? ` in ${category}` : "";
  return `One quick web search: is "${name}"${context} already a known brand, product, company, or app?

Be brief. If you find a clear match, set isExistingBrand true.

Respond ONLY with JSON (no markdown): {"isExistingBrand": boolean, "confidence": 0-100, "summary": "one sentence", "competitors": ["name1"]}`;
}

function buildDeepPrimaryPrompt(name: string, category?: string): string {
  const categorySearch = category
    ? `3. "${name}" ${category} company or product in India`
    : `3. "${name}" India startup or company`;

  return `Run separate web searches for the name "${name}":
1. Exact match — is this already a known brand, product, or company name?
2. "${name}" startup OR app OR software OR SaaS — any active businesses using this name?
${categorySearch}

Synthesize all angles. If any search finds a clear existing brand or product, set isExistingBrand to true and reflect that in confidence.

Respond ONLY with JSON (no markdown): {"isExistingBrand": boolean, "confidence": 0-100, "summary": "1-2 sentence explanation", "competitors": ["name1", "name2"]}`;
}

function buildDeepFollowUpPrompt(name: string, category?: string): string {
  const context = category ? ` in the ${category} space` : "";
  return `Search whether "${name}"${context} has an official website, app store listing, Crunchbase profile, LinkedIn company page, or news coverage as an established business.

Focus on distinguishing real brands from generic/unrelated word matches.

Respond ONLY with JSON (no markdown): {"isExistingBrand": boolean, "confidence": 0-100, "summary": "1-2 sentence explanation", "competitors": ["name1", "name2"]}`;
}

function tryParseJsonObject(candidate: string): GeminiSeoPayload | null {
  try {
    const parsed = JSON.parse(candidate) as GeminiSeoPayload;
    return normalizeGeminiPayload(parsed);
  } catch {
    return null;
  }
}

function repairTruncatedJsonCandidates(candidate: string): string[] {
  const trimmed = candidate.trim().replace(/,\s*$/, "");
  return [
    `${trimmed}"}`,
    `${trimmed}"}}`,
    `${trimmed}}`,
    `${trimmed}"]}`,
    `${trimmed}"}]}`,
    `${trimmed}"]}}`,
  ];
}

function extractGeminiFieldsRegex(text: string): GeminiSeoPayload | null {
  const isBrandMatch = text.match(/"isExistingBrand"\s*:\s*(true|false)/i);
  const confMatch = text.match(/"confidence"\s*:\s*(\d+)/);
  const summaryMatch = text.match(/"summary"\s*:\s*"((?:[^"\\]|\\.)*)(?:"|$)/s);

  if (!isBrandMatch && !confMatch && !summaryMatch) {
    return null;
  }

  const summary = summaryMatch?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, " ").trim() ?? "";

  return {
    isExistingBrand: isBrandMatch?.[1]?.toLowerCase() === "true",
    confidence: confMatch ? Number(confMatch[1]) : 0,
    summary,
    competitors: undefined,
  };
}

function isWeakSummary(summary: string): boolean {
  const s = summary.trim().toLowerCase();
  if (!s) return true;
  return (
    s.includes("re-run") ||
    s.includes("partial") ||
    s.includes("incomplete") ||
    s.includes("no summary available")
  );
}

function fallbackSummary(name: string, isExistingBrand: boolean, confidence: number): string {
  if (isExistingBrand) {
    return confidence >= 70
      ? `"${name}" matches an existing brand or product in web search results.`
      : `"${name}" may overlap with an existing brand — review the sources below.`;
  }
  return `"${name}" does not appear to be a widely known brand in quick search results.`;
}

function normalizeGeminiPayload(parsed: GeminiSeoPayload): GeminiSeoPayload {
  return {
    isExistingBrand: Boolean(parsed.isExistingBrand),
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    summary: String(parsed.summary || "").trim(),
    competitors: parsed.competitors,
  };
}

type ParseQuality = "full" | "partial" | "failed";

function parseGeminiJson(text: string, name: string): { payload: GeminiSeoPayload; quality: ParseQuality } {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*/);
  const candidate = jsonMatch?.[0] ?? cleaned;

  const direct = tryParseJsonObject(candidate);
  if (direct && !isWeakSummary(direct.summary)) {
    return { payload: direct, quality: "full" };
  }

  for (const repaired of repairTruncatedJsonCandidates(candidate)) {
    const parsed = tryParseJsonObject(repaired);
    if (parsed && !isWeakSummary(parsed.summary)) {
      return { payload: parsed, quality: "full" };
    }
  }

  const extracted = extractGeminiFieldsRegex(candidate);
  if (extracted) {
    const payload = {
      ...extracted,
      summary: isWeakSummary(extracted.summary)
        ? fallbackSummary(name, extracted.isExistingBrand, extracted.confidence)
        : extracted.summary,
    };
    return { payload, quality: isWeakSummary(extracted.summary) ? "partial" : "full" };
  }

  if (direct) {
    return {
      payload: {
        ...direct,
        summary: fallbackSummary(name, direct.isExistingBrand, direct.confidence),
      },
      quality: "partial",
    };
  }

  return {
    payload: {
      isExistingBrand: false,
      confidence: 0,
      summary: fallbackSummary(name, false, 0),
      competitors: undefined,
    },
    quality: "failed",
  };
}

function extractSources(chunks: GroundingChunk[] | undefined): SeoSource[] {
  const seen = new Set<string>();
  const sources: SeoSource[] = [];

  for (const chunk of chunks ?? []) {
    const uri = chunk.web?.uri ?? "";
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk.web?.title ?? "Source",
      uri,
    });
  }

  return sources;
}

async function callGeminiText(
  apiKey: string,
  prompt: string,
  modelId: GeminiModelId,
  maxOutputTokens: number,
): Promise<string> {
  const response = await geminiFetch(
    `${getGeminiGenerateUrl(modelId)}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens },
      }),
      signal: AbortSignal.timeout(15_000),
    },
    { operation: "brand_search" },
  );

  if (!response.ok) {
    return "";
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

async function writeBrandSummary(
  apiKey: string,
  name: string,
  payload: GeminiSeoPayload,
  sources: SeoSource[],
  modelId: GeminiModelId,
): Promise<string> {
  const sourceHint = sources
    .slice(0, 5)
    .map((s) => s.title)
    .join(", ");

  const generated = await callGeminiText(
    apiKey,
    `Write one clear sentence about brand uniqueness for the name "${name}".
Existing brand: ${payload.isExistingBrand}
Confidence: ${payload.confidence}%
${sourceHint ? `Sources: ${sourceHint}` : ""}

Reply with only the summary sentence.`,
    modelId,
    128,
  );

  if (generated && !isWeakSummary(generated)) {
    return generated;
  }

  return fallbackSummary(name, payload.isExistingBrand, payload.confidence);
}

interface RawGeminiSearchResult {
  text: string;
  sources: SeoSource[];
}

async function executeGeminiSearch(
  apiKey: string,
  prompt: string,
  modelId: GeminiModelId,
  mode: BrandSearchMode,
): Promise<RawGeminiSearchResult | null> {
  const response = await geminiFetch(
    `${getGeminiGenerateUrl(modelId)}?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens:
            mode === "deep" ? DEEP_MAX_OUTPUT_TOKENS : LITE_MAX_OUTPUT_TOKENS,
        },
      }),
      signal: AbortSignal.timeout(mode === "deep" ? DEEP_TIMEOUT_MS : LITE_TIMEOUT_MS),
    },
    { operation: "brand_search" },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: { groundingChunks?: GroundingChunk[] };
    }>;
  };

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    return null;
  }

  return {
    text,
    sources: extractSources(candidate.groundingMetadata?.groundingChunks),
  };
}

async function callGeminiSearch(
  apiKey: string,
  prompt: string,
  name: string,
  modelId: GeminiModelId,
  mode: BrandSearchMode,
): Promise<GeminiResponse> {
  const raw = await executeGeminiSearch(apiKey, prompt, modelId, mode);
  if (!raw) {
    return {
      payload: {
        isExistingBrand: false,
        confidence: 0,
        summary: fallbackSummary(name, false, 0),
        competitors: undefined,
      },
      sources: [],
    };
  }

  let { payload, quality } = parseGeminiJson(raw.text, name);
  let sources = raw.sources;

  if (quality !== "full" || isWeakSummary(payload.summary)) {
    payload = {
      ...payload,
      summary: await writeBrandSummary(apiKey, name, payload, sources, modelId),
    };
  }

  return { payload, sources };
}

function mergeSources(...sourceLists: SeoSource[][]): SeoSource[] {
  const seen = new Set<string>();
  const merged: SeoSource[] = [];

  for (const sources of sourceLists) {
    for (const source of sources) {
      if (seen.has(source.uri)) continue;
      seen.add(source.uri);
      merged.push(source);
    }
  }

  return merged;
}

function mergePayloads(
  primary: GeminiSeoPayload,
  secondary: GeminiSeoPayload,
): GeminiSeoPayload {
  const isExistingBrand = primary.isExistingBrand || secondary.isExistingBrand;

  let confidence: number;
  if (isExistingBrand) {
    const brandConfidences = [primary, secondary]
      .filter((p) => p.isExistingBrand)
      .map((p) => p.confidence);
    confidence = Math.max(...brandConfidences, 0);
  } else {
    confidence = Math.round((primary.confidence + secondary.confidence) / 2);
  }

  const competitors = [...(primary.competitors ?? []), ...(secondary.competitors ?? [])].filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  const summary =
    primary.summary === secondary.summary
      ? primary.summary
      : `${primary.summary} ${secondary.summary}`.trim();

  return {
    isExistingBrand,
    confidence,
    summary,
    competitors: competitors.length > 0 ? competitors : undefined,
  };
}

function computeSeoScore(isExistingBrand: boolean, confidence: number): number {
  if (isExistingBrand) {
    return Math.max(0, Math.round(100 - confidence));
  }
  return Math.max(confidence, 85);
}

function isBorderline(confidence: number, isExistingBrand: boolean): boolean {
  if (isExistingBrand) {
    return confidence < BORDERLINE_HIGH;
  }
  return confidence > BORDERLINE_LOW && confidence < BORDERLINE_HIGH;
}

function isSearchTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timed?\s*out|aborted/i.test(error.message)
  );
}

function unavailableSeoResult(name: string): SeoResult {
  return {
    score: 50,
    isExistingBrand: false,
    confidence: 0,
    summary: fallbackSummary(name, false, 0),
    sources: [],
  };
}

function timedOutSeoResult(mode: BrandSearchMode): SeoResult {
  const summary =
    mode === "deep"
      ? "Deep brand search could not confirm uniqueness from available results."
      : "Quick brand search could not confirm uniqueness from available results.";
  return {
    score: 50,
    isExistingBrand: false,
    confidence: 0,
    summary,
    sources: [],
  };
}

function toSeoResult(payload: GeminiSeoPayload, sources: SeoSource[]): SeoResult {
  return {
    score: computeSeoScore(payload.isExistingBrand, payload.confidence),
    isExistingBrand: payload.isExistingBrand,
    confidence: payload.confidence,
    summary: payload.summary,
    sources,
  };
}

async function seoCheckLite(
  name: string,
  apiKey: string,
  category: string | undefined,
  model: GeminiModelId,
): Promise<SeoResult> {
  const { payload, sources } = await callGeminiSearch(
    apiKey,
    buildLitePrompt(name, category),
    name,
    model,
    "lite",
  );
  return toSeoResult(payload, sources);
}

async function seoCheckDeep(
  name: string,
  apiKey: string,
  category: string | undefined,
  model: GeminiModelId,
): Promise<SeoResult> {
  const primary = await callGeminiSearch(
    apiKey,
    buildDeepPrimaryPrompt(name, category),
    name,
    model,
    "deep",
  );

  let payload = primary.payload;
  let sources = primary.sources;

  if (isBorderline(primary.payload.confidence, primary.payload.isExistingBrand)) {
    const followUp = await callGeminiSearch(
      apiKey,
      buildDeepFollowUpPrompt(name, category),
      name,
      model,
      "deep",
    );
    payload = mergePayloads(primary.payload, followUp.payload);
    sources = mergeSources(primary.sources, followUp.sources);
  }

  return toSeoResult(payload, sources);
}

export async function seoCheck(
  name: string,
  apiKey: string,
  category?: string,
  modelId?: GeminiModelId,
  mode: BrandSearchMode = "lite",
): Promise<SeoResult> {
  const model = resolveGeminiModelId(modelId);

  try {
    if (mode === "deep") {
      return await seoCheckDeep(name, apiKey, category, model);
    }
    return await seoCheckLite(name, apiKey, category, model);
  } catch (error) {
    if (isSearchTimeout(error)) {
      return timedOutSeoResult(mode);
    }
    return unavailableSeoResult(name);
  }
}
