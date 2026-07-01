import { initializeApp } from "firebase-admin/app";
import { setGlobalOptions } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { AnalyzeNameRequestSchema } from "@naamkaran/shared";
import { AnalyzeStreamRequestSchema } from "@naamkaran/shared";
import { GenerateNamesRequestSchema } from "@naamkaran/shared";
import { SmartPickRequestSchema } from "@naamkaran/shared";
import { resolveGeminiModelId } from "@naamkaran/shared";
import type { AnalyzeStreamEvent } from "@naamkaran/shared";
import type { SmartPickEvent } from "@naamkaran/shared";
import { PUBLIC_CORS_OPTIONS, applyStreamCors } from "./config/cors";
import { REGISTRATION_CHECK_ENABLED } from "./config/features";
import { analysisCacheKey } from "./lib/gemini";
import { getCachedAnalysis, setCachedAnalysis } from "./lib/analysis-cache";
import { runAnalyzeStream } from "./modules/analyze-stream";
import { generateNames as runNameGeneration } from "./modules/name-generation";
import { runSmartPickStream } from "./modules/smart-pick-stream";
import { analyzeName as runAnalysis } from "./orchestrator";

initializeApp();
setGlobalOptions({ maxInstances: 10 });

const googleAiKey = defineSecret("GOOGLE_AI_STUDIO_KEY");
const dataGovKey = defineSecret("DATA_GOV_IN_API_KEY");

const secrets = REGISTRATION_CHECK_ENABLED
  ? [googleAiKey, dataGovKey]
  : [googleAiKey];

function writeSseEvent<T extends { type: string }>(
  res: { write: (chunk: string) => boolean },
  event: T,
) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function resolveAiKey(requestKey?: string): string {
  if (requestKey) return requestKey;
  const serverKey = googleAiKey.value();
  if (!serverKey) {
    throw new HttpsError(
      "failed-precondition",
      "API key is not configured. Set GOOGLE_AI_STUDIO_KEY secret or provide your own key.",
    );
  }
  return serverKey;
}

function resolveAiKeyOrNull(requestKey?: string): string | null {
  if (requestKey) return requestKey;
  return googleAiKey.value() || null;
}

export const analyzeName = onCall(
  {
    ...PUBLIC_CORS_OPTIONS,
    secrets,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    const parsed = AnalyzeNameRequestSchema.safeParse(request.data);
    if (!parsed.success) {
      throw new HttpsError("invalid-argument", "Invalid request", parsed.error.flatten());
    }

    const { name, category, model, apiKey: requestApiKey } = parsed.data;
    const geminiModel = resolveGeminiModelId(model);
    const cacheKey = analysisCacheKey(name, geminiModel);

    const cached = await getCachedAnalysis(cacheKey);
    if (cached) return cached;

    const aiKey = resolveAiKey(requestApiKey);

    const govKey = REGISTRATION_CHECK_ENABLED ? dataGovKey.value() : undefined;
    if (REGISTRATION_CHECK_ENABLED && !govKey) {
      throw new HttpsError(
        "failed-precondition",
        "API keys are not configured. Set DATA_GOV_IN_API_KEY secret.",
      );
    }

    try {
      const result = await runAnalysis(
        name,
        { googleAiKey: aiKey, dataGovKey: govKey },
        category,
        geminiModel,
      );

      await setCachedAnalysis(cacheKey, result);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      throw new HttpsError("internal", message);
    }
  },
);

export const generateNamesHttp = onRequest(
  {
    ...PUBLIC_CORS_OPTIONS,
    secrets: [googleAiKey],
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (req, res) => {
    if (applyStreamCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const parsed = GenerateNamesRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const aiKey = resolveAiKeyOrNull(parsed.data.apiKey);
    if (!aiKey) {
      res.status(500).json({ error: "GOOGLE_AI_STUDIO_KEY is not configured" });
      return;
    }

    try {
      const { genreId, messages, context, smartPick, model } = parsed.data;
      const result = await runNameGeneration(
        genreId,
        messages,
        aiKey,
        context,
        smartPick,
        undefined,
        model,
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Name generation failed";
      res.status(500).json({ error: message });
    }
  },
);

export const analyzeNameStream = onRequest(
  {
    ...PUBLIC_CORS_OPTIONS,
    secrets,
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async (req, res) => {
    if (applyStreamCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const parsed = AnalyzeStreamRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const aiKey = resolveAiKeyOrNull(parsed.data.apiKey);
    if (!aiKey) {
      res.status(500).json({ error: "GOOGLE_AI_STUDIO_KEY is not configured" });
      return;
    }

    const govKey = REGISTRATION_CHECK_ENABLED ? dataGovKey.value() : undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    await runAnalyzeStream(
      parsed.data.name,
      { googleAiKey: aiKey, dataGovKey: govKey },
      parsed.data.category,
      parsed.data.model,
      (event: AnalyzeStreamEvent) => writeSseEvent(res, event),
    );

    res.end();
  },
);

export const smartPickStream = onRequest(
  {
    ...PUBLIC_CORS_OPTIONS,
    secrets: [googleAiKey],
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async (req, res) => {
    if (applyStreamCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const parsed = SmartPickRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
      return;
    }

    const aiKey = resolveAiKeyOrNull(parsed.data.apiKey);
    if (!aiKey) {
      res.status(500).json({ error: "GOOGLE_AI_STUDIO_KEY is not configured" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    try {
      await runSmartPickStream(
        parsed.data.genreId,
        parsed.data.messages,
        aiKey,
        parsed.data.context,
        (event) => writeSseEvent(res, event),
        parsed.data.model,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Smart pick failed";
      writeSseEvent(res, { type: "error", message });
    } finally {
      res.end();
    }
  },
);
