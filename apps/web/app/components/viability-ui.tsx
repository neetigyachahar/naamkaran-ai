import { useState } from "react";
import {
  availabilityClass,
  availabilityLabel,
  scoreBg,
  scoreColor,
  scoreLabel,
} from "../lib/constants";

export function ScoreRing({
  score,
  size = "lg",
}: {
  score: number;
  size?: "lg" | "sm" | "xs";
}) {
  const dim =
    size === "lg" ? "h-32 w-32" : size === "sm" ? "h-14 w-14" : "h-10 w-10";
  const text =
    size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-sm";
  const stroke = 283 - (283 * score) / 100;

  return (
    <div className={`relative shrink-0 ${dim}`}>
      <svg className={`${dim} -rotate-90`} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          className={scoreColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="283"
          strokeDashoffset={stroke}
        />
      </svg>
      <div
        className={`absolute inset-0 flex items-center justify-center font-bold ${text} ${scoreColor(score)}`}
      >
        {score}
      </div>
    </div>
  );
}

export function ExpandableCard({
  title,
  score,
  weight,
  children,
  defaultOpen = true,
}: {
  title: string;
  score: number;
  weight: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`rounded-xl border p-4 ${scoreBg(score)}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">Weight {weight}</p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreRing score={score} size="xs" />
          <span className="text-slate-400 text-sm">{open ? "▾" : "▸"}</span>
        </div>
      </button>
      {open && (
        <div className="mt-4 border-t border-slate-200/60 pt-4">{children}</div>
      )}
    </section>
  );
}

export { availabilityClass, availabilityLabel, scoreColor, scoreLabel };
