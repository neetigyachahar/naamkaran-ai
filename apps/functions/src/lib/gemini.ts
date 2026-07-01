import type { GeminiModelId } from "@naamkaran/shared";
import { DEFAULT_GEMINI_MODEL_ID } from "@naamkaran/shared";

export function getGeminiGenerateUrl(modelId: GeminiModelId): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`;
}

export function analysisCacheKey(name: string, modelId: GeminiModelId): string {
  return `${name.toLowerCase().trim()}:${modelId}`;
}

export { DEFAULT_GEMINI_MODEL_ID };
