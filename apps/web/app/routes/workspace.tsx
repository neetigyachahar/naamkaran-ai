import { useCallback, useRef, useState } from "react";
import type { Route } from "./+types/workspace";
import type { AnalyzeNameResponse } from "@naamkaran/shared";
import { AppHeader } from "../components/AppHeader";
import { NameChat } from "../components/NameChat";
import { ViabilityPanel } from "../components/ViabilityPanel";
import {
  INITIAL_ANALYZE_PROGRESS,
  type AnalyzeProgressState,
  streamAnalyzeName,
} from "../lib/analyze-stream";
import { useByok } from "../lib/byok-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Workspace — Naamkaran" },
    {
      name: "description",
      content:
        "Generate startup names, run domain checks, and score brand viability in the Naamkaran workspace.",
    },
  ];
}

type MobilePanel = "generate" | "viability";

export default function Workspace() {
  const { modelId, apiKey, deepBrandSearch } = useByok();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("generate");
  const [activeName, setActiveName] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeNameResponse | null>(null);
  const [progress, setProgress] = useState<AnalyzeProgressState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(
    async (name: string, category?: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      setMobilePanel("viability");

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setActiveName(trimmed);
      setLoading(true);
      setError(null);
      setSeoError(null);
      setResult(null);
      setProgress(INITIAL_ANALYZE_PROGRESS(trimmed));

      try {
        let capturedSeoError: string | null = null;

        const data = await streamAnalyzeName(
          { name: trimmed, category },
          modelId,
          (state) => {
            setProgress(state);
            if (state.seoError) {
              capturedSeoError = state.seoError;
            }
          },
          abortRef.current.signal,
          apiKey ?? undefined,
          apiKey ? deepBrandSearch : false,
        );
        setResult(data);
        setSeoError(capturedSeoError);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Analysis failed");
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [modelId, apiKey, deepBrandSearch],
  );

  return (
    <div className="flex h-dvh flex-col bg-slate-100 lg:h-screen">
      <AppHeader />

      <div
        className="flex shrink-0 border-b border-slate-200 bg-white lg:hidden"
        role="tablist"
        aria-label="Workspace panels"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobilePanel === "generate"}
          onClick={() => setMobilePanel("generate")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition ${
            mobilePanel === "generate"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500"
          }`}
        >
          Name generator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePanel === "viability"}
          onClick={() => setMobilePanel("viability")}
          className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition ${
            mobilePanel === "viability"
              ? "border-b-2 border-indigo-600 text-indigo-700"
              : "text-slate-500"
          }`}
        >
          Viability
          {activeName ? (
            <span className="max-w-24 truncate rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
              {activeName}
            </span>
          ) : null}
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-5">
        <div
          className={`min-h-0 flex-col border-b border-slate-200 lg:col-span-2 lg:flex lg:border-r lg:border-b-0 ${
            mobilePanel === "generate" ? "flex" : "hidden lg:flex"
          }`}
        >
          <NameChat onNameSelect={runAnalysis} activeName={activeName} />
        </div>

        <div
          className={`min-h-0 flex-col lg:col-span-3 lg:flex ${
            mobilePanel === "viability" ? "flex" : "hidden lg:flex"
          }`}
        >
          <ViabilityPanel
            selectedName={activeName}
            result={result}
            progress={progress}
            loading={loading}
            error={error}
            seoError={seoError}
            deepBrandSearch={apiKey ? deepBrandSearch : false}
            onAnalyze={runAnalysis}
          />
        </div>
      </div>
    </div>
  );
}
