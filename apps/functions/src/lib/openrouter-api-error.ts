import {
  classifyAiApiErrorCode,
  type AiApiErrorCode,
  type AiApiOperation,
} from "@naamkaran/shared";

export class OpenRouterApiError extends Error {
  readonly code: AiApiErrorCode;
  readonly operation: AiApiOperation;
  readonly httpStatus?: number;

  constructor(
    message: string,
    operation: AiApiOperation,
    options?: { code?: AiApiErrorCode; httpStatus?: number },
  ) {
    super(message);
    this.name = "OpenRouterApiError";
    this.operation = operation;
    this.code = options?.code ?? classifyAiApiErrorCode(message);
    this.httpStatus = options?.httpStatus;
  }
}

export function openRouterApiError(
  message: string,
  operation: AiApiOperation,
  options?: { code?: AiApiErrorCode; httpStatus?: number },
): OpenRouterApiError {
  return new OpenRouterApiError(message, operation, options);
}

export function wrapOpenRouterFailure(
  error: unknown,
  operation: AiApiOperation,
): OpenRouterApiError {
  if (error instanceof OpenRouterApiError) return error;

  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return openRouterApiError(error.message || "OpenRouter request timed out", operation, {
        code: "timeout",
      });
    }
    return openRouterApiError(error.message, operation);
  }

  return openRouterApiError("OpenRouter request failed", operation);
}
