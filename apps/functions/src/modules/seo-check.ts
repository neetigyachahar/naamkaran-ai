import type { GeminiModelId, SeoResult, SeoSource } from "@naamkaran/shared";
import { resolveGeminiModelId } from "@naamkaran/shared";
import { geminiFetch } from "../lib/gemini-throttle";
import { getGeminiGenerateUrl } from "../lib/gemini";

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

function buildPrimaryPrompt(name: string, category?: string): string {
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

function buildFollowUpPrompt(name: string, category?: string): string {
  const context = category ? ` in the ${category} space` : "";
  return `Search whether "${name}"${context} has an official website, app store listing, Crunchbase profile, LinkedIn company page, or news coverage as an established business.

Focus on distinguishing real brands from generic/unrelated word matches.

Respond ONLY with JSON (no markdown): {"isExistingBrand": boolean, "confidence": 0-100, "summary": "1-2 sentence explanation", "competitors": ["name1", "name2"]}`;
}

function parseGeminiJson(text: string): GeminiSeoPayload {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? cleaned) as GeminiSeoPayload;
  return {
    isExistingBrand: Boolean(parsed.isExistingBrand),
    confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
    summary: String(parsed.summary || "No summary available."),
    competitors: parsed.competitors,
  };
}

function extractSources(
  chunks: GroundingChunk[] | undefined,
): SeoSource[] {
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

async function callGeminiSearch(
  apiKey: string,
  prompt: string,
  modelId: GeminiModelId,
): Promise<GeminiResponse> {
  const response = await geminiFetch(`${getGeminiGenerateUrl(modelId)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
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
    throw new Error("Gemini returned no content");
  }

  return {
    payload: parseGeminiJson(text),
    sources: extractSources(candidate.groundingMetadata?.groundingChunks),
  };
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
  const isExistingBrand =
    primary.isExistingBrand || secondary.isExistingBrand;

  let confidence: number;
  if (isExistingBrand) {
    const brandConfidences = [primary, secondary]
      .filter((p) => p.isExistingBrand)
      .map((p) => p.confidence);
    confidence = Math.max(...brandConfidences, 0);
  } else {
    confidence = Math.round((primary.confidence + secondary.confidence) / 2);
  }

  const competitors = [
    ...(primary.competitors ?? []),
    ...(secondary.competitors ?? []),
  ].filter((value, index, array) => array.indexOf(value) === index);

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

export async function seoCheck(
  name: string,
  apiKey: string,
  category?: string,
  modelId?: GeminiModelId,
): Promise<SeoResult> {
  const model = resolveGeminiModelId(modelId);
  const primary = await callGeminiSearch(apiKey, buildPrimaryPrompt(name, category), model);

  let payload = primary.payload;
  let sources = primary.sources;

  if (isBorderline(primary.payload.confidence, primary.payload.isExistingBrand)) {
    const followUp = await callGeminiSearch(
      apiKey,
      buildFollowUpPrompt(name, category),
      model,
    );
    payload = mergePayloads(primary.payload, followUp.payload);
    sources = mergeSources(primary.sources, followUp.sources);
  }

  return {
    score: computeSeoScore(payload.isExistingBrand, payload.confidence),
    isExistingBrand: payload.isExistingBrand,
    confidence: payload.confidence,
    summary: payload.summary,
    sources,
  };
}
