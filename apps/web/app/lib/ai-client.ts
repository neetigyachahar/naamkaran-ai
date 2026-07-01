import type { GeminiModelId } from "@naamkaran/shared";
import type { AiApiOperation } from "@naamkaran/shared";
import { reportAiApiError, reportAiApiHttpFailure } from "./ai-api-errors";

export interface AiClientContext {
  modelId?: GeminiModelId;
  genreId?: string;
  hasByok?: boolean;
  smartPick?: boolean;
  deepBrandSearch?: boolean;
  name?: string;
}

export async function postAiJson<TResponse>(
  url: string,
  body: unknown,
  operation: AiApiOperation,
  context?: AiClientContext,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    reportAiApiHttpFailure(operation, response, text, {
      modelId: context?.modelId,
      genreId: context?.genreId,
      hasByok: context?.hasByok,
      smartPick: context?.smartPick,
      deepBrandSearch: context?.deepBrandSearch,
      name: context?.name,
    });
    throw new Error(text || `${operation} failed (${response.status})`);
  }

  return response.json() as Promise<TResponse>;
}

export function reportAiStreamError(
  operation: AiApiOperation,
  error: unknown,
  context?: AiClientContext,
): void {
  reportAiApiError({
    operation,
    error,
    modelId: context?.modelId,
    genreId: context?.genreId,
    hasByok: context?.hasByok,
    smartPick: context?.smartPick,
    deepBrandSearch: context?.deepBrandSearch,
    name: context?.name,
    streamError: true,
  });
}

export function reportAiPartialError(
  operation: AiApiOperation,
  message: string,
  context?: AiClientContext,
): void {
  reportAiApiError({
    operation,
    error: message,
    modelId: context?.modelId,
    genreId: context?.genreId,
    hasByok: context?.hasByok,
    smartPick: context?.smartPick,
    deepBrandSearch: context?.deepBrandSearch,
    name: context?.name,
    streamError: true,
  });
}
