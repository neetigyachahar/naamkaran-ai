import type {
  AnalyzeNameRequest,
  AnalyzeNameResponse,
  DomainCheckResult,
  GeminiModelId,
  SeoResult,
} from "@naamkaran/shared";
import type { AnalyzeStreamEvent } from "@naamkaran/shared";
import { reportAiPartialError, reportAiStreamError } from "./ai-client";

export function getAnalyzeStreamUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
  ) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/analyzeNameStream`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/analyzeNameStream`;
}

export interface AnalyzeProgressState {
  name: string;
  domain: DomainCheckResult | null;
  seo: SeoResult | null;
  compositeScore: number | null;
  seoError: string | null;
  domainPending: boolean;
  seoPending: boolean;
}

export const INITIAL_ANALYZE_PROGRESS = (
  name: string,
): AnalyzeProgressState => ({
  name,
  domain: null,
  seo: null,
  compositeScore: null,
  seoError: null,
  domainPending: true,
  seoPending: false,
});

function applyEvent(
  state: AnalyzeProgressState,
  event: AnalyzeStreamEvent,
): AnalyzeProgressState {
  switch (event.type) {
    case "domain_check":
      if (event.status === "start") {
        return { ...state, domainPending: true, domain: null };
      }
      if (event.status === "done" && event.domain) {
        return {
          ...state,
          domain: event.domain,
          domainPending: false,
          seoPending: true,
        };
      }
      return state;
    case "seo_check":
      if (event.status === "start") {
        return { ...state, seoPending: true, seoError: null };
      }
      if (event.status === "done" && event.seo) {
        return { ...state, seo: event.seo, seoPending: false, seoError: null };
      }
      return state;
    case "seo_error":
      return {
        ...state,
        seoPending: false,
        seoError: event.message,
      };
    case "done":
      return {
        ...state,
        domain: event.result.domain,
        seo: event.result.seo,
        compositeScore: event.result.compositeScore,
        domainPending: false,
        seoPending: false,
      };
    default:
      return state;
  }
}

export async function streamAnalyzeName(
  request: AnalyzeNameRequest,
  modelId: GeminiModelId,
  onProgress: (state: AnalyzeProgressState) => void,
  signal?: AbortSignal,
  apiKey?: string,
  deepBrandSearch?: boolean,
): Promise<AnalyzeNameResponse> {
  let progress = INITIAL_ANALYZE_PROGRESS(request.name);
  onProgress(progress);

  const body: AnalyzeNameRequest = { ...request, model: modelId };
  if (apiKey) {
    body.apiKey = apiKey;
    if (deepBrandSearch) {
      body.deepBrandSearch = true;
    }
  }

  const response = await fetch(getAnalyzeStreamUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const clientContext = {
    modelId,
    hasByok: Boolean(apiKey),
    deepBrandSearch: Boolean(apiKey && deepBrandSearch),
    name: request.name,
  };

  if (!response.ok) {
    const text = await response.text();
    reportAiStreamError("analyze", text || `Analysis failed (${response.status})`, clientContext);
    throw new Error(text || `Analysis failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream from server");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let result: AnalyzeNameResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;

      const event = JSON.parse(line.slice(6)) as AnalyzeStreamEvent;
      if (event.type === "error") {
        reportAiStreamError("analyze", event.message, clientContext);
        throw new Error(event.message);
      }
      if (event.type === "seo_error") {
        reportAiPartialError("brand_search", event.message, clientContext);
        progress = applyEvent(progress, event);
        onProgress(progress);
        continue;
      }
      if (event.type === "done") {
        result = event.result;
        progress = applyEvent(progress, event);
        onProgress(progress);
      } else {
        progress = applyEvent(progress, event);
        onProgress(progress);
      }
    }
  }

  if (!result) {
    const message = "Analysis finished without a result";
    reportAiStreamError("analyze", message, clientContext);
    throw new Error(message);
  }

  return result;
}
