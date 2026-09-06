import type {
  AnalyzeNameResponse,
  DomainCheckResult,
  GeminiModelId,
  RegistrationResult,
  SeoResult,
} from "@naamkaran/shared";
import { parseBrandName, resolveGeminiModelId } from "@naamkaran/shared";
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
  | { type: "seo_failed"; name: string; message: string }
  | { type: "registration_start"; name: string }
  | {
      type: "registration_done";
      name: string;
      registration: RegistrationResult;
    };

function computeCompositeScore(
  domainScore: number,
  seoScore: number,
  registrationScore: number,
): number {
  const composite =
    domainScore * ACTIVE_SCORE_WEIGHTS.domain +
    seoScore * ACTIVE_SCORE_WEIGHTS.seo +
    registrationScore * ACTIVE_SCORE_WEIGHTS.registration;
  return Math.round(composite);
}

function analysisCacheKeyWithCategory(
  name: string,
  modelId: GeminiModelId,
  brandSearchMode: BrandSearchMode,
  category?: string,
): string {
  const base = analysisCacheKey(name, modelId, brandSearchMode);
  const cat = category?.trim().toLowerCase() || "";
  return cat ? `${base}:cat:${cat}` : base;
}

export async function analyzeName(
  name: string,
  secrets: { googleAiKey: string; dataGovKey?: string },
  category?: string,
  modelId?: GeminiModelId,
  brandSearchMode: BrandSearchMode = "lite",
): Promise<AnalyzeNameResponse> {
  const model = resolveGeminiModelId(modelId);
  const brandName = parseBrandName(name).brandName;

  const [domain, seo] = await Promise.all([
    domainCheck(brandName),
    seoCheck(brandName, secrets.googleAiKey, category, model, brandSearchMode),
  ]);

  const registration = REGISTRATION_CHECK_ENABLED
    ? await registrationCheck(name, secrets.dataGovKey!, category)
    : disabledRegistrationResult(name);

  return {
    name,
    compositeScore: computeCompositeScore(
      domain.score,
      seo.score,
      registration.disabled ? 0 : registration.score,
    ),
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
  const brandName = parseBrandName(name).brandName;
  const cacheKey = analysisCacheKeyWithCategory(
    name,
    model,
    brandSearchMode,
    category,
  );
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
    if (!cached.registration.disabled) {
      onProgress({ type: "registration_start", name });
      onProgress({
        type: "registration_done",
        name,
        registration: cached.registration,
      });
    }
    return cached;
  }

  onProgress({ type: "domain_start", name });
  const domain = await domainCheck(brandName);
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
      seo = await seoCheck(brandName, secrets.googleAiKey, category, model, brandSearchMode);
      onProgress({ type: "seo_done", name, seo });
    } catch {
      onProgress({
        type: "seo_failed",
        name,
        message: "Brand search could not be completed.",
      });
      seo = {
        score: 0,
        isExistingBrand: false,
        confidence: 0,
        summary: "Brand search could not be completed.",
        sources: [],
      };
    }
  }

  let registration: RegistrationResult;
  if (!REGISTRATION_CHECK_ENABLED || !secrets.dataGovKey) {
    registration = disabledRegistrationResult(name);
  } else {
    onProgress({ type: "registration_start", name });
    try {
      registration = await registrationCheck(name, secrets.dataGovKey, category);
    } catch {
      registration = {
        ...disabledRegistrationResult(name),
        disabled: false,
        score: 50,
        note: "MCA lookup could not be completed.",
        variants: [],
      };
    }
    onProgress({ type: "registration_done", name, registration });
  }

  const result: AnalyzeNameResponse = {
    name,
    compositeScore: computeCompositeScore(
      domain.score,
      seo.score,
      registration.disabled ? 0 : registration.score,
    ),
    domain,
    seo,
    registration,
  };

  await setCachedAnalysis(cacheKey, result);
  return result;
}
