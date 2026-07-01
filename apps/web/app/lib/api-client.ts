import type {
  GeminiModelId,
  GenerateNamesRequest,
  GenerateNamesResponse,
} from "@naamkaran/shared";

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

  const response = await fetch(getGenerateNamesUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Name generation failed (${response.status})`);
  }

  return response.json() as Promise<GenerateNamesResponse>;
}
