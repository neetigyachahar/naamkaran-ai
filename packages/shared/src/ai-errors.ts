export const AI_API_OPERATIONS = [
  "name_generate",
  "brand_search",
  "smart_pick",
  "analyze",
] as const;

export type AiApiOperation = (typeof AI_API_OPERATIONS)[number];

export const AI_API_ERROR_CODES = [
  "rate_limit",
  "timeout",
  "api_error",
  "no_content",
  "stream_error",
  "unknown",
] as const;

export type AiApiErrorCode = (typeof AI_API_ERROR_CODES)[number];

export function classifyAiApiErrorCode(message: string): AiApiErrorCode {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit")) return "rate_limit";
  if (lower.includes("timeout") || lower.includes("aborted") || lower.includes("timed out")) {
    return "timeout";
  }
  if (lower.includes("no content") || lower.includes("returned no content")) {
    return "no_content";
  }
  if (lower.includes("gemini api error") || lower.includes("api error")) return "api_error";
  return "unknown";
}

export function truncateAiErrorMessage(message: string, maxLength = 100): string {
  const trimmed = message.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}
