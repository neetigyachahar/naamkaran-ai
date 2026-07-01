import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import type { AnalyzeNameResponse } from "@naamkaran/shared";
import type { Route } from "./+types/result.$name";
import { AppHeader } from "../components/AppHeader";
import { ViabilityPanel } from "../components/ViabilityPanel";
import {
  INITIAL_ANALYZE_PROGRESS,
  type AnalyzeProgressState,
  streamAnalyzeName,
} from "../lib/analyze-stream";
import { useByok } from "../lib/byok-context";

export function meta({ params }: Route.MetaArgs) {
  const name = decodeURIComponent(params.name ?? "");
  return [{ title: `${name} — Naamkaran` }];
}

export default function ResultPage() {
  const { name: nameParam } = useParams();
  const location = useLocation();
  const name = decodeURIComponent(nameParam ?? "");
  const { modelId, apiKey } = useByok();
  const [result, setResult] = useState<AnalyzeNameResponse | null>(
    (location.state as { result?: AnalyzeNameResponse } | null)?.result ?? null,
  );
  const [progress, setProgress] = useState<AnalyzeProgressState | null>(null);
  const [loading, setLoading] = useState(!result);
  const [error, setError] = useState<string | null>(null);
  const [seoError, setSeoError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runAnalysis = useCallback(
    async (target: string, category?: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setSeoError(null);
      setResult(null);
      setProgress(INITIAL_ANALYZE_PROGRESS(target));

      try {
        let capturedSeoError: string | null = null;

        const data = await streamAnalyzeName(
          { name: target, category },
          modelId,
          (state) => {
            setProgress(state);
            if (state.seoError) {
              capturedSeoError = state.seoError;
            }
          },
          abortRef.current.signal,
          apiKey ?? undefined,
        );
        setResult(data);
        setSeoError(capturedSeoError);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load results");
      } finally {
        setLoading(false);
        setProgress(null);
      }
    },
    [modelId, apiKey],
  );

  useEffect(() => {
    if (result) return;
    runAnalysis(name);
  }, [name, result, runAnalysis]);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <AppHeader />
      <div className="border-b border-slate-200 bg-white px-6 py-2">
        <Link to="/workspace" className="text-sm text-indigo-600 hover:underline">
          ← Back to workspace
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <ViabilityPanel
          selectedName={name}
          result={result}
          progress={progress}
          loading={loading}
          error={error}
          seoError={seoError}
          onAnalyze={runAnalysis}
        />
      </div>
    </div>
  );
}
