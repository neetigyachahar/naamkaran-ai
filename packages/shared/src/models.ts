import { z } from "zod";

/**
 * Curated set of free OpenRouter models used by Naamkaran.
 *
 * All entries are `:free` variants that support both `response_format`
 * (JSON output, used for name generation and the brand-uniqueness payload)
 * and `tools` (so the OpenRouter web-search plugin/tool can ground the brand
 * check). Free-tier availability rotates over time — see
 * https://openrouter.ai/models?max_price=0 for the current catalog.
 */
export const OPENROUTER_MODELS = [
  {
    id: "google/gemma-4-31b-it:free",
    label: "Gemma 4 31B",
  },
  {
    id: "google/gemma-4-26b-a4b-it:free",
    label: "Gemma 4 26B",
  },
  {
    id: "z-ai/glm-5.2:free",
    label: "GLM 5.2",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    label: "Nemotron 3 Super 120B",
  },
  {
    id: "minimax/minimax-m3:free",
    label: "MiniMax M3",
  },
] as const;

export type OpenRouterModelId = (typeof OPENROUTER_MODELS)[number]["id"];

export const DEFAULT_OPENROUTER_MODEL_ID: OpenRouterModelId =
  "google/gemma-4-31b-it:free";

export const OpenRouterModelIdSchema = z.enum([
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "z-ai/glm-5.2:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "minimax/minimax-m3:free",
]);

export function resolveOpenRouterModelId(model?: string): OpenRouterModelId {
  const parsed = OpenRouterModelIdSchema.safeParse(model);
  return parsed.success ? parsed.data : DEFAULT_OPENROUTER_MODEL_ID;
}

export function getOpenRouterModelLabel(modelId: OpenRouterModelId): string {
  return (
    OPENROUTER_MODELS.find((model) => model.id === modelId)?.label ?? modelId
  );
}
