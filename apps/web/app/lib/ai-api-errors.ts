import type { AiApiErrorCode, AiApiOperation } from "@naamkaran/shared";
import { classifyAiApiErrorCode, truncateAiErrorMessage } from "@naamkaran/shared";
import { trackAiApiError } from "./analytics";

export interface AiApiErrorReportContext {
  operation: AiApiOperation;
  error: unknown;
  httpStatus?: number;
  modelId?: string;
  genreId?: string;
  hasByok?: boolean;
  smartPick?: boolean;
  deepBrandSearch?: boolean;
  name?: string;
  streamError?: boolean;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown AI API error";
}

export function reportAiApiError(context: AiApiErrorReportContext): void {
  const message = errorMessage(context.error);
  const errorCode: AiApiErrorCode = classifyAiApiErrorCode(message);

  trackAiApiError({
    operation: context.operation,
    error_code: errorCode,
    error_message: truncateAiErrorMessage(message),
    http_status: context.httpStatus,
    model_id: context.modelId,
    genre_id: context.genreId,
    has_byok: context.hasByok,
    smart_pick: context.smartPick,
    deep_brand_search: context.deepBrandSearch,
    name: context.name ? truncateAiErrorMessage(context.name, 40) : undefined,
    stream_error: context.streamError,
  });
}

export function reportAiApiHttpFailure(
  operation: AiApiOperation,
  response: Response,
  body: string,
  context?: Omit<AiApiErrorReportContext, "operation" | "error" | "httpStatus">,
): void {
  reportAiApiError({
    operation,
    error: body || `${operation} failed (${response.status})`,
    httpStatus: response.status,
    streamError: true,
    ...context,
  });
}
