import {
  classifyAiApiErrorCode,
  type AiApiErrorCode,
  type AiApiOperation,
} from "@naamkaran/shared";

export class GeminiApiError extends Error {
  readonly code: AiApiErrorCode;
  readonly operation: AiApiOperation;
  readonly httpStatus?: number;

  constructor(
    message: string,
    operation: AiApiOperation,
    options?: { code?: AiApiErrorCode; httpStatus?: number },
  ) {
    super(message);
    this.name = "GeminiApiError";
    this.operation = operation;
    this.code = options?.code ?? classifyAiApiErrorCode(message);
    this.httpStatus = options?.httpStatus;
  }
}

export function geminiApiError(
  message: string,
  operation: AiApiOperation,
  options?: { code?: AiApiErrorCode; httpStatus?: number },
): GeminiApiError {
  return new GeminiApiError(message, operation, options);
}

export function wrapGeminiFailure(
  error: unknown,
  operation: AiApiOperation,
): GeminiApiError {
  if (error instanceof GeminiApiError) return error;

  if (error instanceof Error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return geminiApiError(error.message || "Gemini request timed out", operation, {
        code: "timeout",
      });
    }
    return geminiApiError(error.message, operation);
  }

  return geminiApiError("Gemini request failed", operation);
}
