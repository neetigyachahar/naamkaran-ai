import type { SmartPickState, PickPhase } from "../lib/smart-pick";
import {
  SMART_PICK_MIN_SCORE,
  SMART_PICK_REVEAL_COUNT,
} from "../lib/smart-pick";

interface SmartPickProgressProps {
  state: SmartPickState;
  activeName: string | null;
  onNameSelect: (name: string) => void;
}

const STEPS: { phase: PickPhase; label: string }[] = [
  { phase: "considering", label: "Considering" },
  { phase: "domain", label: "Domain check" },
  { phase: "seo", label: "Brand search" },
  { phase: "scoring", label: "Score" },
];

function phaseIndex(phase: PickPhase): number {
  return STEPS.findIndex((s) => s.phase === phase);
}

function StepIcon({ status }: { status: "done" | "active" | "pending" }) {
  if (status === "done") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
        ✓
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
      </span>
    );
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white" />
  );
}

function AcceptedChip({
  name,
  score,
  active,
  onSelect,
}: {
  name: string;
  score: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition sm:text-sm ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-50"
      }`}
    >
      <span>{name}</span>
      <span
        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
          active ? "bg-indigo-500 text-white" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {score}
      </span>
    </button>
  );
}

function RejectedChip({ name, score }: { name: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200 sm:text-sm">
      <span>{name}</span>
      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-600">
        {score}
      </span>
    </span>
  );
}

export function SmartPickProgress({
  state,
  activeName,
  onNameSelect,
}: SmartPickProgressProps) {
  const {
    accepted,
    rejected,
    activeName: evaluating,
    activePhase,
    activeDomainScore,
    activeSeoScore,
    activeCompositeScore,
    generatingMessage,
    isComplete,
    summaryMessage,
    checkedCount,
  } = state;

  const isBusy =
    !isComplete &&
    (activePhase !== "idle" || generatingMessage != null || evaluating != null);

  const currentStepIdx = phaseIndex(activePhase);

  return (
    <div className="mt-3 space-y-3">
      {isBusy && (
        <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
              Smart pick
            </p>
            <p className="text-xs text-slate-500">
              {accepted.length}/{SMART_PICK_REVEAL_COUNT} strong
              {checkedCount > 0 && ` · ${checkedCount} checked`}
            </p>
          </div>

          {generatingMessage && (
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              {generatingMessage}
            </div>
          )}

          {evaluating && !generatingMessage && (
            <div className="mt-2">
              <p className="text-sm font-medium text-slate-900">
                Evaluating “{evaluating}”
              </p>
              <ol className="mt-2 space-y-1.5">
                {STEPS.map((step, i) => {
                  let status: "done" | "active" | "pending" = "pending";
                  if (currentStepIdx > i) status = "done";
                  else if (currentStepIdx === i) status = "active";

                  let detail: string | null = null;
                  if (step.phase === "domain" && activeDomainScore != null) {
                    detail = `score ${activeDomainScore}`;
                  }
                  if (step.phase === "seo" && activeSeoScore != null) {
                    detail = `score ${activeSeoScore}`;
                  }
                  if (step.phase === "scoring" && activeCompositeScore != null) {
                    detail = `${activeCompositeScore} total`;
                  }

                  return (
                    <li key={step.phase} className="flex items-center gap-2 text-sm">
                      <StepIcon status={status} />
                      <span
                        className={
                          status === "active"
                            ? "font-medium text-slate-900"
                            : status === "done"
                              ? "text-slate-600"
                              : "text-slate-400"
                        }
                      >
                        {step.label}
                        {detail && (
                          <span className="ml-1 text-xs text-slate-500">({detail})</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}

      {(accepted.length > 0 || (isComplete && rejected.length > 0)) && (
        <div
          className={`grid gap-3 ${accepted.length > 0 && rejected.length > 0 ? "sm:grid-cols-2" : ""}`}
        >
          {accepted.length > 0 && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <p className="text-xs font-semibold text-emerald-800">
                Strong picks
                <span className="ml-1 font-normal text-emerald-600">
                  ({SMART_PICK_MIN_SCORE}+)
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {accepted.map(({ name, score }) => (
                  <AcceptedChip
                    key={name}
                    name={name}
                    score={score}
                    active={activeName === name}
                    onSelect={() => onNameSelect(name)}
                  />
                ))}
              </div>
            </div>
          )}

          {rejected.length > 0 && (
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
              <p className="text-xs font-semibold text-rose-800">
                Didn&apos;t pass
                <span className="ml-1 font-normal text-rose-500">
                  (below {SMART_PICK_MIN_SCORE})
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rejected.map(({ name, score }) => (
                  <RejectedChip key={name} name={name} score={score} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {isComplete && summaryMessage && (
        <p className="text-xs text-amber-700">{summaryMessage}</p>
      )}
    </div>
  );
}
