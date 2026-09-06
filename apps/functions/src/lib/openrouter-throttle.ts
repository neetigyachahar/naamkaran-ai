import type { AiApiOperation } from "@naamkaran/shared";
import { openRouterApiError, wrapOpenRouterFailure } from "./openrouter-api-error";

// OpenRouter free :free models are capped at 20 RPM. Space calls at ≥3.2s
// (~18.7 RPM) so retries / overlapping flows stay under the ceiling.
const MIN_GAP_MS = 3_200;
const MAX_ATTEMPTS = 3;
let lastCallAt = 0;
let chain: Promise<void> = Promise.resolve();

export interface OpenRouterFetchOptions {
  maxAttempts?: number;
  operation: AiApiOperation;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse a Retry-After header (seconds or HTTP date) into milliseconds. */
function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) {
    return Math.ceil(seconds * 1000) + 500;
  }
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now()) + 500;
  }
  return null;
}

/** OpenRouter surfaces upstream retry hints inside the error body metadata. */
function parseRetryDelayBody(body: string): number | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: { metadata?: { retryDelay?: string | number; retry_after?: string | number } };
    };
    const meta = parsed.error?.metadata;
    const raw = meta?.retryDelay ?? meta?.retry_after;
    if (raw == null) return null;
    const seconds =
      typeof raw === "number" ? raw : Number.parseFloat(String(raw).replace(/s$/i, ""));
    if (!Number.isNaN(seconds)) {
      return Math.ceil(seconds * 1000) + 500;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export async function waitForOpenRouterSlot(): Promise<void> {
  chain = chain.then(async () => {
    const elapsed = Date.now() - lastCallAt;
    if (elapsed < MIN_GAP_MS) {
      await sleep(MIN_GAP_MS - elapsed);
    }
    lastCallAt = Date.now();
  });
  await chain;
}

export async function openRouterFetch(
  url: string,
  init: RequestInit,
  options: OpenRouterFetchOptions,
): Promise<Response> {
  const { operation, maxAttempts = MAX_ATTEMPTS } = options;

  try {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await waitForOpenRouterSlot();

      console.info(
        `[openrouter] fetch start op=${operation} attempt=${attempt + 1}/${maxAttempts}`,
      );
      const startedAt = Date.now();
      const response = await fetch(url, init);
      const elapsedMs = Date.now() - startedAt;

      if (response.status !== 429) {
        console.info(
          `[openrouter] fetch done op=${operation} status=${response.status} elapsedMs=${elapsedMs} attempt=${attempt + 1}`,
        );
        return response;
      }

      const retryFromHeader = parseRetryAfterHeader(response.headers.get("retry-after"));
      const body = await response.text();
      const retryMs =
        retryFromHeader ?? parseRetryDelayBody(body) ?? MIN_GAP_MS * (attempt + 1);
      console.warn(
        `[openrouter] 429 rate limit op=${operation} attempt=${attempt + 1}/${maxAttempts} retryInMs=${retryMs} body=${body.slice(0, 240)}`,
      );
      await sleep(retryMs);
    }

    throw openRouterApiError("OpenRouter API rate limit exceeded after retries", operation, {
      code: "rate_limit",
      httpStatus: 429,
    });
  } catch (error) {
    console.error(
      `[openrouter] fetch failed op=${operation} error=${error instanceof Error ? error.message : String(error)}`,
    );
    throw wrapOpenRouterFailure(error, operation);
  }
}
