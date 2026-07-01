import { z } from "zod";
import { GeminiModelIdSchema } from "./gemini-models.js";
import { ChatMessageSchema, NameGenreIdSchema } from "./name-genres.js";

export const SMART_PICK_MIN_SCORE = 60;
export const SMART_PICK_MIN_ACCEPTED = 3;
export const SMART_PICK_REVEAL_COUNT = 3;
export const SMART_PICK_BATCH_SIZE = 6;
export const SMART_PICK_MAX_CANDIDATES = 15;

/** Skip brand search when domain is too weak to reach SMART_PICK_MIN_SCORE (50/50 domain+seo weights). */
export const SMART_PICK_MIN_DOMAIN_SCORE = 2 * SMART_PICK_MIN_SCORE - 100;

export const SmartPickRequestSchema = z.object({
  genreId: NameGenreIdSchema,
  messages: z.array(ChatMessageSchema).min(1).max(30),
  context: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().max(200).optional(),
  ),
  model: GeminiModelIdSchema.optional(),
  apiKey: z.string().min(10).optional(),
});

export type SmartPickRequest = z.infer<typeof SmartPickRequestSchema>;

export type SmartPickEvent =
  | { type: "reply"; reply: string }
  | { type: "generating"; message: string }
  | { type: "considering"; name: string }
  | {
      type: "domain_check";
      name: string;
      status: "start" | "done";
      score?: number;
    }
  | {
      type: "seo_check";
      name: string;
      status: "start" | "done";
      score?: number;
    }
  | { type: "scored"; name: string; compositeScore: number }
  | { type: "accepted"; name: string; score: number }
  | { type: "rejected"; name: string; score: number }
  | {
      type: "done";
      names: string[];
      rejectedNames: string[];
      nameScores: Record<string, number>;
      message?: string;
    }
  | { type: "error"; message: string };
