import type { AiApiOperation, OpenRouterModelId } from "@naamkaran/shared";
import { DEFAULT_OPENROUTER_MODEL_ID } from "@naamkaran/shared";
import { openRouterApiError } from "./openrouter-api-error";
import { openRouterFetch } from "./openrouter-throttle";

// Base URL is overridable via env for proxying / self-hosting / local testing.
export const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL?.replace(/\/$/, "") || "https://openrouter.ai/api/v1";
export const OPENROUTER_CHAT_URL = `${OPENROUTER_BASE_URL}/chat/completions`;

// Sent for OpenRouter's optional app-attribution / rankings headers.
const APP_URL = "https://naamkaran-ai.web.app";
const APP_TITLE = "Naamkaran";

export type BrandSearchMode = "lite" | "deep";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface UrlCitationAnnotation {
  type: "url_citation";
  url_citation?: { url?: string; title?: string; content?: string };
}

interface OpenRouterResponseMessage {
  content?: string | null;
  annotations?: UrlCitationAnnotation[];
}

interface OpenRouterChatResponse {
  choices?: Array<{ message?: OpenRouterResponseMessage }>;
  error?: { message?: string; code?: number };
}

export interface WebCitation {
  title: string;
  uri: string;
}

export interface ChatCompletionResult {
  text: string;
  citations: WebCitation[];
}

export interface ChatCompletionParams {
  apiKey: string;
  model: OpenRouterModelId;
  messages: OpenRouterMessage[];
  operation: AiApiOperation;
  maxTokens?: number;
  timeoutMs?: number;
  /** Enforce a JSON object response (OpenRouter `response_format`). */
  jsonMode?: boolean;
  /**
   * When set, attaches OpenRouter's server-side web-search plugin so the model
   * grounds its answer in live results (returned as `annotations`). The value
   * caps how many results OpenRouter fetches per request (cost control).
   *
   * The `web` plugin runs exactly one search per request and works with any
   * model regardless of tool-calling support. For model-driven, multi-search
   * behavior, swap this for the `openrouter:web_search` server tool instead:
   * https://openrouter.ai/docs/guides/features/server-tools/web-search
   */
  webSearchMaxResults?: number;
}

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": APP_URL,
    "X-Title": APP_TITLE,
  };
}

function extractCitations(message: OpenRouterResponseMessage | undefined): WebCitation[] {
  const seen = new Set<string>();
  const citations: WebCitation[] = [];

  for (const annotation of message?.annotations ?? []) {
    if (annotation.type !== "url_citation") continue;
    const uri = annotation.url_citation?.url ?? "";
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    citations.push({
      title: annotation.url_citation?.title || "Source",
      uri,
    });
  }

  return citations;
}

/**
 * Single-turn OpenRouter chat completion. Returns the assistant text plus any
 * web-search citations. HTTP failures throw an {@link OpenRouterApiError};
 * an empty/blocked completion returns empty text so callers can degrade.
 */
export async function chatCompletion(
  params: ChatCompletionParams,
): Promise<ChatCompletionResult> {
  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
  };

  if (params.maxTokens != null) {
    body.max_tokens = params.maxTokens;
  }
  if (params.jsonMode) {
    body.response_format = { type: "json_object" };
  }
  if (params.webSearchMaxResults != null) {
    body.plugins = [{ id: "web", max_results: params.webSearchMaxResults }];
  }

  const response = await openRouterFetch(
    OPENROUTER_CHAT_URL,
    {
      method: "POST",
      headers: headers(params.apiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(params.timeoutMs ?? 60_000),
    },
    { operation: params.operation },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw openRouterApiError(
      `OpenRouter API error ${response.status}: ${errorBody}`,
      params.operation,
      { httpStatus: response.status },
    );
  }

  const data = (await response.json()) as OpenRouterChatResponse;
  if (data.error) {
    throw openRouterApiError(
      `OpenRouter API error: ${data.error.message ?? "unknown"}`,
      params.operation,
    );
  }

  const message = data.choices?.[0]?.message;
  return {
    text: message?.content?.trim() ?? "",
    citations: extractCitations(message),
  };
}

export function analysisCacheKey(
  name: string,
  modelId: OpenRouterModelId,
  brandSearchMode: BrandSearchMode = "lite",
): string {
  return `${name.toLowerCase().trim()}:${modelId}:${brandSearchMode}`;
}

export { DEFAULT_OPENROUTER_MODEL_ID };
