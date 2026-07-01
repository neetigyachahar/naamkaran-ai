import { useState } from "react";
import type {
  AnalyzeNameResponse,
  DomainCheckResult,
  SeoResult,
} from "@naamkaran/shared";
import type { AnalyzeProgressState } from "../lib/analyze-stream";
import { CATEGORIES } from "../lib/constants";
import {
  availabilityClass,
  availabilityLabel,
  ExpandableCard,
  ScoreRing,
  scoreColor,
  scoreLabel,
} from "./viability-ui";

interface ViabilityPanelProps {
  selectedName: string | null;
  result: AnalyzeNameResponse | null;
  progress: AnalyzeProgressState | null;
  loading: boolean;
  error: string | null;
  seoError: string | null;
  onAnalyze: (name: string, category?: string) => void;
}

function HeaderStatus({
  compositeScore,
  domainPending,
  seoPending,
  seoError,
}: {
  compositeScore: number | null;
  domainPending: boolean;
  seoPending: boolean;
  seoError: string | null;
}) {
  if (compositeScore != null) {
    return (
      <p className={`text-sm font-medium ${scoreColor(compositeScore)}`}>
        {scoreLabel(compositeScore)}
      </p>
    );
  }
  if (domainPending) {
    return <p className="text-sm text-slate-500">Checking domain availability…</p>;
  }
  if (seoPending) {
    return <p className="text-sm text-slate-500">Running Google brand search…</p>;
  }
  if (seoError) {
    return <p className="text-sm text-amber-700">Domain checked — brand search failed</p>;
  }
  return null;
}

function BrandSection({
  seo,
  seoError,
  seoPending,
}: {
  seo: SeoResult | null;
  seoError: string | null;
  seoPending: boolean;
}) {
  if (seoError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Brand uniqueness</h3>
            <p className="text-xs text-slate-500">Weight 50%</p>
          </div>
        </div>
        <p className="mt-4 border-t border-rose-200/80 pt-4 text-sm text-rose-700">
          {seoError}
        </p>
      </section>
    );
  }
  if (seo) {
    return <BrandResults seo={seo} />;
  }
  if (seoPending) {
    return <ModuleCardSkeleton title="Brand uniqueness" />;
  }
  return null;
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

function ModuleCardSkeleton({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-slate-900">{title}</p>
          <SkeletonBar className="h-3 w-16" />
        </div>
        <SkeletonBar className="h-10 w-10 rounded-full" />
      </div>
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <SkeletonBar className="h-10 w-full" />
        <SkeletonBar className="h-10 w-full" />
        <SkeletonBar className="h-10 w-5/6" />
      </div>
    </section>
  );
}

function DomainResults({
  name,
  domain,
}: {
  name: string;
  domain: DomainCheckResult;
}) {
  const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

  return (
    <ExpandableCard title="Domain availability" score={domain.score} weight="50%">
      <ul className="space-y-1.5">
        {domain.results.map((d) => (
          <li
            key={d.tld}
            className="flex flex-col gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="min-w-0 truncate font-mono text-slate-800">
              {slug}
              {d.tld}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-slate-400">
                T{d.tier} · {d.source}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${availabilityClass(d.available)}`}
              >
                {availabilityLabel(d.available)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </ExpandableCard>
  );
}

function BrandResults({ seo }: { seo: SeoResult }) {
  return (
    <ExpandableCard title="Brand uniqueness" score={seo.score} weight="50%">
      <p className="text-sm text-slate-700">{seo.summary}</p>
      <p className="mt-2 text-sm text-slate-600">
        Existing brand? <strong>{seo.isExistingBrand ? "Yes" : "No"}</strong>
        <span className="mx-2">·</span>
        Confidence {seo.confidence}%
      </p>
      {seo.sources.length > 0 && (
        <ul className="mt-3 space-y-1">
          {seo.sources.map((source) => (
            <li key={source.uri}>
              <a
                href={source.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-600 hover:underline"
              >
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </ExpandableCard>
  );
}

function ViabilityContent({
  name,
  domain,
  seo,
  compositeScore,
  seoError,
  domainPending,
  seoPending,
}: {
  name: string;
  domain: DomainCheckResult | null;
  seo: SeoResult | null;
  compositeScore: number | null;
  seoError: string | null;
  domainPending: boolean;
  seoPending: boolean;
}) {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <header className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
        {compositeScore != null ? (
          <ScoreRing score={compositeScore} size="lg" />
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{name}</h3>
          <HeaderStatus
            compositeScore={compositeScore}
            domainPending={domainPending}
            seoPending={seoPending}
            seoError={seoError}
          />
        </div>
      </header>

      {domain ? (
        <DomainResults name={name} domain={domain} />
      ) : domainPending ? (
        <ModuleCardSkeleton title="Domain availability" />
      ) : null}

      <BrandSection seo={seo} seoError={seoError} seoPending={seoPending} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col justify-center p-4 sm:p-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
          How it works
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">
          Click a name to see if it&apos;s viable
        </h3>
        <ol className="mt-6 space-y-4">
          <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              1
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">Generate names</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Pick a style and describe your product in the chat.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              2
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">Click any suggestion</p>
              <p className="mt-0.5 text-sm text-slate-500">
                We check domains (RDAP/WHOIS) and brand conflicts instantly.
              </p>
            </div>
          </li>
          <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              3
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">Compare scores</p>
              <p className="mt-0.5 text-sm text-slate-500">
                Domain + brand uniqueness combined into one score.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

function ManualSearch({
  onAnalyze,
  loading,
}: {
  onAnalyze: (name: string, category?: string) => void;
  loading: boolean;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (trimmed) onAnalyze(trimmed, category || undefined);
      }}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
        Manual check
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type any name…"
          className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:flex-[6]"
          disabled={loading}
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 sm:flex-[4]"
            disabled={loading}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
          >
            Check
          </button>
        </div>
      </div>
    </form>
  );
}

export function ViabilityPanel({
  selectedName,
  result,
  progress,
  loading,
  error,
  seoError,
  onAnalyze,
}: ViabilityPanelProps) {
  const viewName = result?.name ?? progress?.name ?? selectedName;
  const domain = result?.domain ?? progress?.domain ?? null;
  const seo = result?.seo ?? progress?.seo ?? null;
  const compositeScore = result?.compositeScore ?? progress?.compositeScore ?? null;
  const activeSeoError = seoError ?? progress?.seoError ?? null;
  const domainPending = loading && (progress?.domainPending ?? !domain);
  const seoPending =
    loading && !activeSeoError && (progress?.seoPending ?? (domain != null && !seo));
  const showResults = Boolean(viewName && (loading || result || domain));

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-slate-50/80">
      <div className="hidden h-20 shrink-0 flex-col justify-center border-b border-slate-200 bg-white px-4 lg:flex">
        <h2 className="font-semibold text-slate-900">Viability score</h2>
        <p className="line-clamp-2 text-sm text-slate-500">Domain availability + brand uniqueness</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {error && !domain ? (
          <div className="p-6">
            <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          </div>
        ) : showResults && viewName ? (
          <ViabilityContent
            name={viewName}
            domain={domain}
            seo={seo}
            compositeScore={compositeScore}
            seoError={activeSeoError}
            domainPending={domainPending}
            seoPending={seoPending}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      <ManualSearch onAnalyze={onAnalyze} loading={loading} />
    </div>
  );
}
