import {
  DEFAULT_GEMINI_MODEL_ID,
  GEMINI_MODELS,
  type GeminiModelId,
  GeminiModelIdSchema,
} from "@naamkaran/shared";

const STORAGE_KEY = "naamkaran-gemini-model";

export function loadGeminiModel(): GeminiModelId {
  if (typeof window === "undefined") {
    return DEFAULT_GEMINI_MODEL_ID;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = GeminiModelIdSchema.safeParse(stored);
  return parsed.success ? parsed.data : DEFAULT_GEMINI_MODEL_ID;
}

export function saveGeminiModel(modelId: GeminiModelId): void {
  localStorage.setItem(STORAGE_KEY, modelId);
}

export { GEMINI_MODELS, DEFAULT_GEMINI_MODEL_ID };
export type { GeminiModelId };
