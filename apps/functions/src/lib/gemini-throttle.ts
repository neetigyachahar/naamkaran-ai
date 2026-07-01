// Free tier is often ~5 Gemini RPM → ~12s between calls at sustained max.
// We use a shorter gap because checks run sequentially; 429 retries handle bursts.
const MIN_GAP_MS = 4_000;
let lastCallAt = 0;
let chain: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryDelayMs(body: string): number | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: {
        details?: Array<{ retryDelay?: string; "@type"?: string }>;
      };
    };
    for (const detail of parsed.error?.details ?? []) {
      if (detail.retryDelay) {
        const seconds = Number.parseFloat(detail.retryDelay.replace("s", ""));
        if (!Number.isNaN(seconds)) {
          return Math.ceil(seconds * 1000) + 500;
        }
      }
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

export async function waitForGeminiSlot(): Promise<void> {
  chain = chain.then(async () => {
    const elapsed = Date.now() - lastCallAt;
    if (elapsed < MIN_GAP_MS) {
      await sleep(MIN_GAP_MS - elapsed);
    }
    lastCallAt = Date.now();
  });
  await chain;
}

export async function geminiFetch(
  url: string,
  init: RequestInit,
  maxAttempts = 5,
): Promise<Response> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await waitForGeminiSlot();

    const response = await fetch(url, init);

    if (response.status !== 429) {
      return response;
    }

    const body = await response.text();
    const retryMs = parseRetryDelayMs(body) ?? MIN_GAP_MS * (attempt + 1);
    await sleep(retryMs);
  }

  throw new Error("Gemini API rate limit exceeded after retries");
}
