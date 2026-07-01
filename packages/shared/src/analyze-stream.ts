import { z } from "zod";
import type { AnalyzeNameResponse, DomainCheckResult, SeoResult } from "./types.js";
import { GeminiModelIdSchema } from "./gemini-models.js";

export const AnalyzeStreamRequestSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().max(100).optional(),
  ),
  model: GeminiModelIdSchema.optional(),
  apiKey: z.string().min(10).optional(),
});

export type AnalyzeStreamRequest = z.infer<typeof AnalyzeStreamRequestSchema>;

export type AnalyzeStreamEvent =
  | {
      type: "domain_check";
      name: string;
      status: "start" | "done";
      domain?: DomainCheckResult;
    }
  | {
      type: "seo_check";
      name: string;
      status: "start" | "done";
      seo?: SeoResult;
    }
  | { type: "seo_error"; name: string; message: string }
  | { type: "done"; result: AnalyzeNameResponse }
  | { type: "error"; message: string };
