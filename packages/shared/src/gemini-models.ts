import { z } from "zod";

export const GEMINI_MODELS = [
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash Lite",
    rpd: 500,
  },
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    rpd: 20,
  },
  {
    id: "gemini-3-flash-preview",
    label: "Gemini 3 Flash",
    rpd: 20,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    rpd: 20,
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash Lite",
    rpd: 20,
  },
] as const;

export type GeminiModelId = (typeof GEMINI_MODELS)[number]["id"];

export const DEFAULT_GEMINI_MODEL_ID: GeminiModelId = "gemini-2.5-flash";

export const GeminiModelIdSchema = z.enum([
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

export function resolveGeminiModelId(model?: string): GeminiModelId {
  const parsed = GeminiModelIdSchema.safeParse(model);
  return parsed.success ? parsed.data : DEFAULT_GEMINI_MODEL_ID;
}

export function getGeminiModelLabel(modelId: GeminiModelId): string {
  return GEMINI_MODELS.find((model) => model.id === modelId)?.label ?? modelId;
}
