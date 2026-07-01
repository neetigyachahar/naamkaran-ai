import type { Request } from "firebase-functions/v2/https";

/** Origins allowed to call HTTP (SSE) functions from the browser. */
export const ALLOWED_ORIGINS = [
  "https://naamkaran-ai.web.app",
  "https://naamkaran-407d7.web.app",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

/** Gen2 callable + HTTP functions need public invoker and explicit CORS from custom hosting domains. */
export const PUBLIC_CORS_OPTIONS = {
  cors: ALLOWED_ORIGINS,
  invoker: "public" as const,
};

type CorsResponse = {
  set: (key: string, value: string) => void;
  status: (code: number) => { send: (body: string) => void };
};

export function applyStreamCors(req: Request, res: CorsResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }

  return false;
}
