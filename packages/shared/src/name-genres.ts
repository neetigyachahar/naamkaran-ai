import { z } from "zod";
import { GeminiModelIdSchema } from "./gemini-models.js";

export const DEFAULT_GENRE_ID = "best-fit" as const;

export const NAME_GENRES = [
  {
    id: "best-fit",
    label: "Best fit (AI picks)",
    description:
      "No fixed formula — AI chooses whatever style fits your product best: coined, descriptive, playful, or bold.",
    example: "Varies by idea — Naamkaran, Swiggy, Stripe",
  },
  {
    id: "action-phrase",
    label: "Action phrase",
    description:
      "Imperative verb + object — a mini call-to-action baked into the name. Turns a noun into something you do.",
    example: "MakeMyTrip, BookMyShow, FindMyDoctor",
  },
  {
    id: "gen-z",
    label: "Gen Z cool",
    description:
      "Short, vowel-heavy, internet-native — feels like it already lives on TikTok or a group chat.",
    example: "Zaply, Noomo, BeReal",
  },
  {
    id: "single-word",
    label: "Single English word",
    description:
      "One real dictionary word. Evocative, not literal — the meaning is felt, not spelled out.",
    example: "Stripe, Notion, Bloom",
  },
  {
    id: "twisted-word",
    label: "Twisted classic",
    description:
      "A familiar word with altered spelling — still recognizable, but ownable and domain-ready.",
    example: "Shopify, Lyft, Fiverr",
  },
  {
    id: "minimal-tech",
    label: "Minimal tech",
    description:
      "4–7 letters, crisp and confident. Engineering-forward — nothing cute, nothing extra.",
    example: "Linear, Vercel, Raycast",
  },
  {
    id: "desi-modern",
    label: "Desi modern",
    description:
      "Indian linguistic roots in Roman script — authentic to India, pronounceable everywhere.",
    example: "Dunzo, Meesho, Razorpay",
  },
  {
    id: "playful",
    label: "Playful & friendly",
    description:
      "Warm, bouncy, human — names that sound like they'd wave at you on the way in.",
    example: "Bumble, Duolingo, Canva",
  },
  {
    id: "premium",
    label: "Premium & luxury",
    description:
      "Elevated and restrained — sounds expensive before anyone sees the price tag.",
    example: "Aesop, Monocle, Aman",
  },
  {
    id: "compound",
    label: "Two-word blend",
    description:
      "Two ideas fused into one — portmanteau or compound that hints at what you do.",
    example: "Airbnb, YouTube, Pinterest",
  },
] as const;

export type NameGenreId = (typeof NAME_GENRES)[number]["id"];

export const NameGenreIdSchema = z.enum([
  "best-fit",
  "action-phrase",
  "gen-z",
  "single-word",
  "twisted-word",
  "minimal-tech",
  "desi-modern",
  "playful",
  "premium",
  "compound",
]);

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const DEFAULT_NAME_COUNT = 10;

export const GenerateNamesRequestSchema = z.object({
  genreId: NameGenreIdSchema,
  messages: z.array(ChatMessageSchema).min(1).max(30),
  context: z.preprocess(
    (value) => (value === null || value === "" ? undefined : value),
    z.string().max(200).optional(),
  ),
  smartPick: z.boolean().optional(),
  model: GeminiModelIdSchema.optional(),
  apiKey: z.string().min(10).optional(),
});

export type GenerateNamesRequest = z.infer<typeof GenerateNamesRequestSchema>;

export const GenerateNamesResponseSchema = z.object({
  reply: z.string(),
  names: z.array(z.string()),
});

export type GenerateNamesResponse = z.infer<typeof GenerateNamesResponseSchema>;
