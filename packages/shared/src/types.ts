import { z } from "zod";
import { GeminiModelIdSchema } from "./gemini-models.js";

export const AnalyzeNameRequestSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().max(100).optional(),
  ),
  model: GeminiModelIdSchema.optional(),
  apiKey: z.string().min(10).optional(),
  deepBrandSearch: z.boolean().optional(),
});

export type AnalyzeNameRequest = z.infer<typeof AnalyzeNameRequestSchema>;

export const DomainResultSchema = z.object({
  tld: z.string(),
  available: z.union([z.boolean(), z.literal("unknown")]),
  source: z.enum(["rdap", "whois"]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export type DomainResult = z.infer<typeof DomainResultSchema>;

export const DomainCheckResultSchema = z.object({
  score: z.number().min(0).max(100),
  results: z.array(DomainResultSchema),
});

export type DomainCheckResult = z.infer<typeof DomainCheckResultSchema>;

export const SeoSourceSchema = z.object({
  title: z.string(),
  uri: z.string(),
});

export type SeoSource = z.infer<typeof SeoSourceSchema>;

export const SeoResultSchema = z.object({
  score: z.number().min(0).max(100),
  isExistingBrand: z.boolean(),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  sources: z.array(SeoSourceSchema),
});

export type SeoResult = z.infer<typeof SeoResultSchema>;

export const McaMatchSchema = z.object({
  companyName: z.string(),
  cin: z.string(),
  status: z.string(),
});

export type McaMatch = z.infer<typeof McaMatchSchema>;

export const RegistrationResultSchema = z.object({
  score: z.number().min(0).max(100),
  mcaMatches: z.array(McaMatchSchema),
  trademarkSearchUrl: z.string(),
  disabled: z.boolean().optional(),
});

export type RegistrationResult = z.infer<typeof RegistrationResultSchema>;

export const AnalyzeNameResponseSchema = z.object({
  name: z.string(),
  compositeScore: z.number().min(0).max(100),
  domain: DomainCheckResultSchema,
  seo: SeoResultSchema,
  registration: RegistrationResultSchema,
});

export type AnalyzeNameResponse = z.infer<typeof AnalyzeNameResponseSchema>;

export * from "./name-genres.js";
export * from "./smart-pick.js";
export * from "./gemini-models.js";
export * from "./analyze-stream.js";
export * from "./ai-errors.js";
