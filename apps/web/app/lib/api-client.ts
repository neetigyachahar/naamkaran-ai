import type {
  GeminiModelId,
  GenerateNamesRequest,
  GenerateNamesResponse,
} from "@naamkaran/shared";
import { postAiJson } from "./ai-client";

export function getGenerateNamesUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
  ) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/generateNamesHttp`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/generateNamesHttp`;
}

export async function generateNames(
  request: GenerateNamesRequest,
  modelId: GeminiModelId,
  apiKey?: string,
): Promise<GenerateNamesResponse> {
  const payload: GenerateNamesRequest = {
    genreId: request.genreId,
    messages: request.messages,
    model: modelId,
  };
  if (request.context) {
    payload.context = request.context;
  }
  if (request.smartPick) {
    payload.smartPick = true;
  }
  if (apiKey) {
    payload.apiKey = apiKey;
  }

  return postAiJson<GenerateNamesResponse>(
    getGenerateNamesUrl(),
    payload,
    "name_generate",
    {
      modelId,
      genreId: request.genreId,
      hasByok: Boolean(apiKey),
      smartPick: Boolean(request.smartPick),
    },
  );
}
