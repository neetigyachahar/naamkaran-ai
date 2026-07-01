import type { GeminiModelId } from "@naamkaran/shared";
import { GEMINI_MODELS, getGeminiModelLabel } from "@naamkaran/shared";
import { useState } from "react";
import { Link } from "react-router";
import { useByok } from "../lib/byok-context";
import { ByokDialog } from "./ByokDialog";
import { LogoMark } from "./LogoMark";

export function AppHeader() {
  const { apiKey, isActive, modelId, setModelId, saveByok, clearByok } = useByok();
  const [dialogOpen, setDialogOpen] = useState(false);

  const selected = GEMINI_MODELS.find((model) => model.id === modelId);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-3 sm:h-16 sm:gap-4 sm:px-6">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 sm:gap-3"
        >
          <LogoMark variant="mark" size={40} className="shrink-0" />
          <div className="flex min-w-0 flex-col justify-center gap-0.5">
            <p className="truncate text-lg font-bold leading-none tracking-tight sm:text-[1.35rem]">
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Naam
              </span>
              <span className="text-slate-900">karan</span>
            </p>
            <p className="hidden text-[11px] leading-none font-medium tracking-wide text-slate-400 uppercase sm:block">
              Name · Validate · Launch
            </p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          {isActive ? (
            <span className="hidden items-center gap-1.5 text-xs font-medium text-emerald-700 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {getGeminiModelLabel(modelId)}
            </span>
          ) : (
            <div className="flex items-center">
              <label htmlFor="gemini-model" className="sr-only">
                Gemini model
              </label>
              <select
                id="gemini-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value as GeminiModelId)}
                className="max-w-[11rem] rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:max-w-none sm:text-sm"
                title={selected ? `${selected.label} — ${selected.rpd} req/day` : undefined}
              >
                {GEMINI_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.label} ({model.rpd}/day)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 sm:text-sm ${
              isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {isActive ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 sm:hidden" aria-hidden />
                Your key
              </span>
            ) : (
              "BYOK"
            )}
          </button>
        </div>
      </header>

      <ByokDialog
        open={dialogOpen}
        initialKey={apiKey ?? ""}
        initialModelId={modelId}
        onClose={() => setDialogOpen(false)}
        onSave={saveByok}
        onClear={clearByok}
      />
    </>
  );
}
