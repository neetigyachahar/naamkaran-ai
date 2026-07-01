import type { AnalyzeStreamEvent, GeminiModelId } from "@naamkaran/shared";
import { resolveGeminiModelId } from "@naamkaran/shared";
import { analysisCacheKey } from "../lib/gemini";
import { getCachedAnalysis, setCachedAnalysis } from "../lib/analysis-cache";
import { analyzeNameWithProgress } from "../orchestrator";

type Emit = (event: AnalyzeStreamEvent) => void;

export async function runAnalyzeStream(
  name: string,
  secrets: { googleAiKey: string; dataGovKey?: string },
  category: string | undefined,
  modelId: GeminiModelId | undefined,
  emit: Emit,
): Promise<void> {
  const model = resolveGeminiModelId(modelId);
  const cacheKey = analysisCacheKey(name, model);
  const cached = await getCachedAnalysis(cacheKey);

  if (cached) {
    emit({ type: "domain_check", name, status: "start" });
    emit({ type: "domain_check", name, status: "done", domain: cached.domain });
    emit({ type: "seo_check", name, status: "start" });
    emit({ type: "seo_check", name, status: "done", seo: cached.seo });
    emit({ type: "done", result: cached });
    return;
  }

  try {
    const result = await analyzeNameWithProgress(
      name,
      secrets,
      category,
      (step) => {
        if (step.type === "domain_start") {
          emit({ type: "domain_check", name, status: "start" });
        } else if (step.type === "domain_done") {
          emit({
            type: "domain_check",
            name,
            status: "done",
            domain: step.domain,
          });
        } else if (step.type === "seo_start") {
          emit({ type: "seo_check", name, status: "start" });
        } else if (step.type === "seo_done") {
          emit({
            type: "seo_check",
            name,
            status: "done",
            seo: step.seo,
          });
        } else if (step.type === "seo_failed") {
          emit({ type: "seo_error", name, message: step.message });
        }
      },
      model,
    );

    await setCachedAnalysis(cacheKey, result);
    emit({ type: "done", result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Analysis failed";
    emit({ type: "error", message });
  }
}
