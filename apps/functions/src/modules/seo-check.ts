import type { OpenRouterModelId, SeoResult, SeoSource } from "@naamkaran/shared";
import { resolveOpenRouterModelId } from "@naamkaran/shared";
import { chatCompletion, type BrandSearchMode, type WebCitation } from "../lib/openrouter";

const LITE_TIMEOUT_MS = 60_000;
const DEEP_TIMEOUT_MS = 90_000;
const LITE_MAX_OUTPUT_TOKENS = 384;
const DEEP_MAX_OUTPUT_TOKENS = 512;
const LITE_SEARCH_RESULTS = 3;
const DEEP_SEARCH_RESULTS = 5;
const BORDERLINE_LOW = 35;
const BORDERLINE_HIGH = 65;

interface SeoPayload {
  isExistingBrand: boolean;
  confidence: number;
  summary: string;
  competitors?: string[];
}

interface SearchResponse {
  payload: SeoPayload;
  sources: SeoSource[];
}

function buildLitePrompt(name: string, category?: string): string {
  const context = category ? ` in ${category}` : "";
  return `Search the web: is "${name}"${context} already a known brand, product, company, or app?

Be brief. If you find a clear match, set isExistingBrand true.

Respond ONLY with JSON (no markdown): {"isExistingBrand": boolean, "confidence": 0-100, "summary": "one sentence", "competitors": ["name1"]}`;
}

function buildDeepPrimaryPrompt(name: string, category?: string): string {
  const categorySearch = category
    ? `3. "${name}" ${category} company or product in India`
    : `3. "${name}" India startup or company`;

  return `Search the web thoroughly for the name "${name}":
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

function tryParseJsonObject(candidate: string): SeoPayload | null {
  try {
    const parsed = JSON.parse(candidate) as SeoPayload;
    return normalizePayload(parsed);
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

function extractFieldsRegex(text: string): SeoPayload | null {
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

function normalizePayload(parsed: SeoPayload): SeoPayload {
  return {
    isExistingBrand: Boolean(parsed.isExistingBrand),
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    summary: String(parsed.summary || "").trim(),
    competitors: parsed.competitors,
  };
}

type ParseQuality = "full" | "partial" | "failed";

function parseSeoJson(text: string, name: string): { payload: SeoPayload; quality: ParseQuality } {
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

  const extracted = extractFieldsRegex(candidate);
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

function toSeoSources(citations: WebCitation[]): SeoSource[] {
  return citations.map((citation) => ({ title: citation.title, uri: citation.uri }));
}

async function writeBrandSummary(
  apiKey: string,
  name: string,
  payload: SeoPayload,
  sources: SeoSource[],
  modelId: OpenRouterModelId,
): Promise<string> {
  const sourceHint = sources
    .slice(0, 5)
    .map((s) => s.title)
    .join(", ");

  try {
    const { text } = await chatCompletion({
      apiKey,
      model: modelId,
      operation: "brand_search",
      maxTokens: 128,
      timeoutMs: 20_000,
      messages: [
        {
          role: "user",
          content: `Write one clear sentence about brand uniqueness for the name "${name}".
Existing brand: ${payload.isExistingBrand}
Confidence: ${payload.confidence}%
${sourceHint ? `Sources: ${sourceHint}` : ""}

Reply with only the summary sentence.`,
        },
      ],
    });

    if (text && !isWeakSummary(text)) {
      return text;
    }
  } catch {
    // fall through to deterministic summary
  }

  return fallbackSummary(name, payload.isExistingBrand, payload.confidence);
}

async function executeSearch(
  apiKey: string,
  prompt: string,
  modelId: OpenRouterModelId,
  mode: BrandSearchMode,
): Promise<{ text: string; sources: SeoSource[] } | null> {
  const { text, citations } = await chatCompletion({
    apiKey,
    model: modelId,
    operation: "brand_search",
    maxTokens: mode === "deep" ? DEEP_MAX_OUTPUT_TOKENS : LITE_MAX_OUTPUT_TOKENS,
    timeoutMs: mode === "deep" ? DEEP_TIMEOUT_MS : LITE_TIMEOUT_MS,
    webSearchMaxResults: mode === "deep" ? DEEP_SEARCH_RESULTS : LITE_SEARCH_RESULTS,
    messages: [{ role: "user", content: prompt }],
  });

  if (!text) {
    return null;
  }

  return { text, sources: toSeoSources(citations) };
}

async function runSearch(
  apiKey: string,
  prompt: string,
  name: string,
  modelId: OpenRouterModelId,
  mode: BrandSearchMode,
): Promise<SearchResponse> {
  const raw = await executeSearch(apiKey, prompt, modelId, mode);
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

  let { payload, quality } = parseSeoJson(raw.text, name);
  const sources = raw.sources;

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

function mergePayloads(primary: SeoPayload, secondary: SeoPayload): SeoPayload {
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

function toSeoResult(payload: SeoPayload, sources: SeoSource[]): SeoResult {
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
  model: OpenRouterModelId,
): Promise<SeoResult> {
  const { payload, sources } = await runSearch(
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
  model: OpenRouterModelId,
): Promise<SeoResult> {
  const primary = await runSearch(
    apiKey,
    buildDeepPrimaryPrompt(name, category),
    name,
    model,
    "deep",
  );

  let payload = primary.payload;
  let sources = primary.sources;

  if (isBorderline(primary.payload.confidence, primary.payload.isExistingBrand)) {
    const followUp = await runSearch(
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
  modelId?: OpenRouterModelId,
  mode: BrandSearchMode = "lite",
): Promise<SeoResult> {
  const model = resolveOpenRouterModelId(modelId);

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
