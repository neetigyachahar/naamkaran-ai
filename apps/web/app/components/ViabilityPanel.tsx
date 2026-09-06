import { useState } from "react";
import type {
  AnalyzeNameResponse,
  DomainCheckResult,
  RegistrationResult,
  SeoResult,
} from "@naamkaran/shared";
import {
  MCA_CHECK_NOTE,
  MCA_LEGAL_NAME_HINT,
  brandNameToDomainSlug,
  parseBrandName,
} from "@naamkaran/shared";
import type { AnalyzeProgressState } from "../lib/analyze-stream";
import { CATEGORIES } from "../lib/constants";
import { AnalyticsEvents, trackEvent } from "../lib/analytics";
import {
  availabilityClass,
  availabilityLabel,
  ExpandableCard,
  ScoreRing,
  ScoreRingSpinner,
  scoreColor,
  scoreLabel,
} from "./viability-ui";

const WEIGHT_DOMAIN = "35%";
const WEIGHT_BRAND = "35%";
const WEIGHT_MCA = "30%";

interface ViabilityPanelProps {
  selectedName: string | null;
  result: AnalyzeNameResponse | null;
  progress: AnalyzeProgressState | null;
  loading: boolean;
  error: string | null;
  seoError: string | null;
  deepBrandSearch?: boolean;
  onAnalyze: (name: string, category?: string) => void;
}

function brandSearchModeLabel(deepBrandSearch: boolean): string {
  return deepBrandSearch ? "Deep search" : "Quick mode";
}

function HeaderStatus({
  compositeScore,
  domainPending,
  seoPending,
  registrationPending,
  seoError,
  deepBrandSearch,
}: {
  compositeScore: number | null;
  domainPending: boolean;
  seoPending: boolean;
  registrationPending: boolean;
  seoError: string | null;
  deepBrandSearch: boolean;
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
    return (
      <p className="text-sm text-slate-500">
        {deepBrandSearch
          ? "Running deep brand search…"
          : "Running quick brand search…"}
      </p>
    );
  }
  if (registrationPending) {
    return <p className="text-sm text-slate-500">Checking MCA name forms…</p>;
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
  deepBrandSearch,
}: {
  seo: SeoResult | null;
  seoError: string | null;
  seoPending: boolean;
  deepBrandSearch: boolean;
}) {
  if (seoError) {
    return (
      <section className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">Brand uniqueness</h3>
            <p className="text-xs text-slate-500">Weight {WEIGHT_BRAND} · Tap for details</p>
          </div>
        </div>
        <p className="mt-4 border-t border-rose-200/80 pt-4 text-sm text-rose-700">
          {seoError}
        </p>
      </section>
    );
  }
  if (seo) {
    return <BrandResults seo={seo} deepBrandSearch={deepBrandSearch} />;
  }
  if (seoPending) {
    return (
      <ModuleCardSkeleton
        title="Brand uniqueness"
        subtitle={`Checking in ${brandSearchModeLabel(deepBrandSearch).toLowerCase()}…`}
      />
    );
  }
  return null;
}

function ModuleCardSkeleton({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-indigo-600">{subtitle ?? "Checking…"}</p>
        </div>
        <div
          className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-500"
          aria-hidden
        />
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
  const slug = brandNameToDomainSlug(parseBrandName(name).brandName);

  return (
    <ExpandableCard
      title="Domain availability"
      score={domain.score}
      weight={WEIGHT_DOMAIN}
    >
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

function BrandResults({
  seo,
  deepBrandSearch,
}: {
  seo: SeoResult;
  deepBrandSearch: boolean;
}) {
  return (
    <ExpandableCard
      title="Brand uniqueness"
      score={seo.score}
      weight={WEIGHT_BRAND}
      defaultOpen
    >
      <p className="text-xs font-medium text-slate-400">
        {brandSearchModeLabel(deepBrandSearch)}
      </p>
      <p className="mt-1 text-sm text-slate-700">{seo.summary}</p>
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

function RegistrationResults({
  registration,
}: {
  registration: RegistrationResult;
}) {
  if (registration.disabled) return null;

  const variants = registration.variants ?? [];

  return (
    <ExpandableCard
      title="MCA registration"
      score={registration.score}
      weight={WEIGHT_MCA}
    >
      {variants.length === 0 ? (
        <p className="text-sm text-slate-600">No MCA forms were checked.</p>
      ) : (
        <ul className="space-y-1.5">
          {variants.map((variant) => (
            <li
              key={variant.query}
              className="flex flex-col gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-slate-800">{variant.query}</p>
                <p className="text-xs text-slate-400">
                  {variant.label}
                  {variant.status ? ` · ${variant.status}` : ""}
                  {variant.cin ? ` · ${variant.cin}` : ""}
                </p>
              </div>
              <span
                className={`shrink-0 self-start rounded-full px-2 py-0.5 text-xs font-medium sm:self-center ${availabilityClass(variant.available)}`}
              >
                {availabilityLabel(variant.available)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-500">{registration.note ?? MCA_CHECK_NOTE}</p>
      {registration.trademarkSearchUrl ? (
        <a
          href={registration.trademarkSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-indigo-600 hover:underline"
        >
          Check trademarks (IP India)
        </a>
      ) : null}
    </ExpandableCard>
  );
}

function ViabilityContent({
  name,
  domain,
  seo,
  registration,
  compositeScore,
  seoError,
  domainPending,
  seoPending,
  registrationPending,
  deepBrandSearch,
}: {
  name: string;
  domain: DomainCheckResult | null;
  seo: SeoResult | null;
  registration: RegistrationResult | null;
  compositeScore: number | null;
  seoError: string | null;
  domainPending: boolean;
  seoPending: boolean;
  registrationPending: boolean;
  deepBrandSearch: boolean;
}) {
  const checking =
    domainPending || seoPending || registrationPending || compositeScore == null;

  return (
    <div className="space-y-4 p-4 sm:p-5">
      <header className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
        {compositeScore != null ? (
          <ScoreRing score={compositeScore} size="lg" />
        ) : (
          <ScoreRingSpinner size="lg" />
        )}
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">{name}</h3>
          <HeaderStatus
            compositeScore={compositeScore}
            domainPending={domainPending}
            seoPending={seoPending}
            registrationPending={registrationPending}
            seoError={seoError}
            deepBrandSearch={deepBrandSearch}
          />
          <p className="mt-2 text-sm text-slate-500">
            {compositeScore != null
              ? "Tap a card below to see domain, brand, or MCA details."
              : "Scores will land here — then tap a card for details."}
          </p>
        </div>
      </header>

      {domain ? (
        <DomainResults key={`${name}-domain`} name={name} domain={domain} />
      ) : checking ? (
        <ModuleCardSkeleton
          title="Domain availability"
          subtitle={domainPending ? "Checking domains…" : "Waiting…"}
        />
      ) : null}

      {seo || seoError ? (
        <BrandSection
          key={`${name}-brand-section`}
          seo={seo}
          seoError={seoError}
          seoPending={seoPending}
          deepBrandSearch={deepBrandSearch}
        />
      ) : checking ? (
        <ModuleCardSkeleton
          title="Brand uniqueness"
          subtitle={
            seoPending
              ? `Checking in ${brandSearchModeLabel(deepBrandSearch).toLowerCase()}…`
              : domainPending
                ? "Waiting for domain check…"
                : "Waiting…"
          }
        />
      ) : null}

      {registration && !registration.disabled ? (
        <RegistrationResults
          key={`${name}-mca`}
          registration={registration}
        />
      ) : checking ? (
        <ModuleCardSkeleton
          title="MCA registration"
          subtitle={
            registrationPending
              ? "Checking company name forms…"
              : "Waiting…"
          }
        />
      ) : null}
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
                We check domains, brand uniqueness, and MCA company-name forms.
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
                Domain, brand, and MCA forms combine into one score.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

function InfoHint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] font-semibold text-slate-500 hover:border-indigo-400 hover:text-indigo-600"
        aria-label="About name checking"
      >
        i
      </button>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-left text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
      </span>
    </span>
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
        if (trimmed) {
          trackEvent(AnalyticsEvents.MANUAL_VIABILITY_CHECK, {
            has_category: Boolean(category),
          });
          onAnalyze(trimmed, category || undefined);
        }
      }}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Manual check
        </p>
        <InfoHint text={MCA_LEGAL_NAME_HINT} />
      </div>
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
  deepBrandSearch = false,
  onAnalyze,
}: ViabilityPanelProps) {
  const viewName = result?.name ?? progress?.name ?? selectedName;
  const domain = result?.domain ?? progress?.domain ?? null;
  const seo = result?.seo ?? progress?.seo ?? null;
  const registration = result?.registration ?? progress?.registration ?? null;
  const compositeScore = result?.compositeScore ?? progress?.compositeScore ?? null;
  const activeSeoError = seoError ?? progress?.seoError ?? null;
  const domainPending = loading && (progress?.domainPending ?? !domain);
  const seoPending =
    loading && !activeSeoError && (progress?.seoPending ?? (domain != null && !seo));
  const registrationPending =
    loading &&
    (progress?.registrationPending ??
      (domain != null && seo != null && !(registration && !registration.disabled)));
  const showResults = Boolean(viewName && (loading || result || domain));

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-slate-50/80">
      <div className="hidden h-20 shrink-0 flex-col justify-center border-b border-slate-200 bg-white px-4 lg:flex">
        <h2 className="font-semibold text-slate-900">Viability score</h2>
        <p className="line-clamp-2 text-sm text-slate-500">
          Domains + brand uniqueness + MCA name forms
        </p>
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
            registration={registration}
            compositeScore={compositeScore}
            seoError={activeSeoError}
            domainPending={domainPending}
            seoPending={seoPending}
            registrationPending={registrationPending}
            deepBrandSearch={deepBrandSearch}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      <ManualSearch onAnalyze={onAnalyze} loading={loading} />
    </div>
  );
}
