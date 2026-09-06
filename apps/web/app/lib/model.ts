import {
  DEFAULT_OPENROUTER_MODEL_ID,
  OPENROUTER_MODELS,
  type OpenRouterModelId,
  OpenRouterModelIdSchema,
} from "@naamkaran/shared";

const STORAGE_KEY = "naamkaran-model";

export function loadModel(): OpenRouterModelId {
  if (typeof window === "undefined") {
    return DEFAULT_OPENROUTER_MODEL_ID;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = OpenRouterModelIdSchema.safeParse(stored);
  return parsed.success ? parsed.data : DEFAULT_OPENROUTER_MODEL_ID;
}

export function saveModel(modelId: OpenRouterModelId): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

export { OPENROUTER_MODELS, DEFAULT_OPENROUTER_MODEL_ID };
export type { OpenRouterModelId };
