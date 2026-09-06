import type { OpenRouterModelId, SeoResult, SeoSource } from "@naamkaran/shared";
import { resolveOpenRouterModelId } from "@naamkaran/shared";
import { chatCompletion, type BrandSearchMode, type WebCitation } from "../lib/openrouter";

const LITE_TIMEOUT_MS = 60_000;
const DEEP_TIMEOUT_MS = 90_000;
const LITE_MAX_OUTPUT_TOKENS = 384;
const DEEP_MAX_OUTPUT_TOKENS = 512;
/** Fewer results = cheaper search; still one API call either way. */
const LITE_SEARCH_RESULTS = 2;
const DEEP_SEARCH_RESULTS = 3;

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
4. Official website, app store, Crunchbase, LinkedIn company page, or news coverage as an established business.

Synthesize all angles. If any search finds a clear existing brand or product, set isExistingBrand to true and reflect that in confidence.
Distinguish real brands from generic/unrelated word matches.

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
    jsonMode: true,
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
    console.warn(
      `[seo-check] empty model response name=${name} mode=${mode} model=${modelId}`,
    );
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
  console.info(
    `[seo-check] parsed name=${name} quality=${quality} isExistingBrand=${payload.isExistingBrand} confidence=${payload.confidence} sources=${sources.length} textChars=${raw.text.length}`,
  );

  // Never spend a second LLM call rewriting the summary — use a deterministic fallback.
  if (isWeakSummary(payload.summary)) {
    payload = {
      ...payload,
      summary: fallbackSummary(name, payload.isExistingBrand, payload.confidence),
    };
  }

  return { payload, sources };
}

function computeSeoScore(isExistingBrand: boolean, confidence: number): number {
  if (isExistingBrand) {
    return Math.max(0, Math.round(100 - confidence));
  }
  return Math.max(confidence, 85);
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

/** One web-grounded call only — no borderline follow-up (saves RPM/RPD). */
async function seoCheckDeep(
  name: string,
  apiKey: string,
  category: string | undefined,
  model: OpenRouterModelId,
): Promise<SeoResult> {
  const { payload, sources } = await runSearch(
    apiKey,
    buildDeepPrimaryPrompt(name, category),
    name,
    model,
    "deep",
  );
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
  console.info(`[seo-check] start name=${name} mode=${mode} model=${model}`);

  try {
    const result =
      mode === "deep"
        ? await seoCheckDeep(name, apiKey, category, model)
        : await seoCheckLite(name, apiKey, category, model);
    console.info(
      `[seo-check] done name=${name} score=${result.score} isExistingBrand=${result.isExistingBrand} confidence=${result.confidence} sources=${result.sources.length}`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isSearchTimeout(error)) {
      console.warn(`[seo-check] timeout name=${name} mode=${mode} error=${message}`);
      return timedOutSeoResult(mode);
    }
    // Soft-fail so Smart pick / analyze can continue; score 50 + confidence 0 is this path.
    console.error(
      `[seo-check] unavailable fallback name=${name} mode=${mode} error=${message}`,
    );
    return unavailableSeoResult(name);
  }
}
