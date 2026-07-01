import type { AnalyzeNameResponse, DomainCheckResult, GeminiModelId, SeoResult } from "@naamkaran/shared";
import { resolveGeminiModelId } from "@naamkaran/shared";
import { REGISTRATION_CHECK_ENABLED } from "./config/features";
import { ACTIVE_SCORE_WEIGHTS } from "./config/tlds";
import { analysisCacheKey, type BrandSearchMode } from "./lib/gemini";
import { getCachedAnalysis, setCachedAnalysis } from "./lib/analysis-cache";
import { domainCheck } from "./modules/domain-check";
import {
  disabledRegistrationResult,
  registrationCheck,
} from "./modules/registration-check";
import { seoCheck } from "./modules/seo-check";

export type AnalysisProgressEvent =
  | { type: "domain_start"; name: string }
  | { type: "domain_done"; name: string; domain: DomainCheckResult }
  | { type: "seo_start"; name: string }
  | { type: "seo_done"; name: string; seo: SeoResult }
  | { type: "seo_failed"; name: string; message: string };

function computeCompositeScore(domainScore: number, seoScore: number): number {
  const composite =
    domainScore * ACTIVE_SCORE_WEIGHTS.domain +
    seoScore * ACTIVE_SCORE_WEIGHTS.seo;
  return Math.round(composite);
}

export async function analyzeName(
  name: string,
  secrets: { googleAiKey: string; dataGovKey?: string },
  category?: string,
  modelId?: GeminiModelId,
  brandSearchMode: BrandSearchMode = "lite",
): Promise<AnalyzeNameResponse> {
  const model = resolveGeminiModelId(modelId);
  const [domain, seo] = await Promise.all([
    domainCheck(name),
    seoCheck(name, secrets.googleAiKey, category, model, brandSearchMode),
  ]);

  const registration = REGISTRATION_CHECK_ENABLED
    ? await registrationCheck(name, secrets.dataGovKey!)
    : disabledRegistrationResult(name);

  return {
    name,
    compositeScore: computeCompositeScore(domain.score, seo.score),
    domain,
    seo,
    registration,
  };
}

export async function analyzeNameWithProgress(
  name: string,
  secrets: { googleAiKey: string; dataGovKey?: string },
  category: string | undefined,
  onProgress: (event: AnalysisProgressEvent) => void,
  modelId?: GeminiModelId,
  options?: { skipSeoIfDomainBelow?: number; brandSearchMode?: BrandSearchMode },
): Promise<AnalyzeNameResponse> {
  const model = resolveGeminiModelId(modelId);
  const brandSearchMode = options?.brandSearchMode ?? "lite";
  const cacheKey = analysisCacheKey(name, model, brandSearchMode);
  const cached = await getCachedAnalysis(cacheKey);
  if (cached) {
    onProgress({ type: "domain_start", name });
    onProgress({ type: "domain_done", name, domain: cached.domain });
    const skipSeo =
      options?.skipSeoIfDomainBelow != null &&
      cached.domain.score < options.skipSeoIfDomainBelow;
    if (!skipSeo) {
      onProgress({ type: "seo_start", name });
      onProgress({ type: "seo_done", name, seo: cached.seo });
    }
    return cached;
  }

  onProgress({ type: "domain_start", name });
  const domain = await domainCheck(name);
  onProgress({ type: "domain_done", name, domain });

  const skipSeo =
    options?.skipSeoIfDomainBelow != null &&
    domain.score < options.skipSeoIfDomainBelow;

  let seo: SeoResult;
  if (skipSeo) {
    seo = {
      score: 0,
      isExistingBrand: false,
      confidence: 0,
      summary: "",
      sources: [],
    };
  } else {
    onProgress({ type: "seo_start", name });
    try {
      seo = await seoCheck(name, secrets.googleAiKey, category, model, brandSearchMode);
      onProgress({ type: "seo_done", name, seo });
    } catch {
      onProgress({ type: "seo_failed", name, message: "Brand search could not be completed." });
      seo = {
        score: 0,
        isExistingBrand: false,
        confidence: 0,
        summary: "Brand search could not be completed.",
        sources: [],
      };
    }
  }

  const registration =
    skipSeo || !REGISTRATION_CHECK_ENABLED
      ? disabledRegistrationResult(name)
      : await registrationCheck(name, secrets.dataGovKey!);

  const result: AnalyzeNameResponse = {
    name,
    compositeScore: computeCompositeScore(domain.score, seo.score),
    domain,
    seo,
    registration,
  };

  await setCachedAnalysis(cacheKey, result);
  return result;
}
