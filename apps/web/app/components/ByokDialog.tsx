import type { GeminiModelId } from "@naamkaran/shared";
import { GEMINI_MODELS } from "@naamkaran/shared";
import { useEffect, useState } from "react";

interface ByokDialogProps {
  open: boolean;
  initialKey: string;
  initialModelId: GeminiModelId;
  initialDeepBrandSearch: boolean;
  onClose: () => void;
  onSave: (apiKey: string, modelId: GeminiModelId, deepBrandSearch: boolean) => void;
  onClear: () => void;
}

export function ByokDialog({
  open,
  initialKey,
  initialModelId,
  initialDeepBrandSearch,
  onClose,
  onSave,
  onClear,
}: ByokDialogProps) {
  const [keyInput, setKeyInput] = useState(initialKey);
  const [modelId, setModelId] = useState<GeminiModelId>(initialModelId);
  const [deepBrandSearch, setDeepBrandSearch] = useState(initialDeepBrandSearch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKeyInput(initialKey);
    setModelId(initialModelId);
    setDeepBrandSearch(initialDeepBrandSearch);
    setError(null);
  }, [open, initialKey, initialModelId, initialDeepBrandSearch]);

  if (!open) return null;

  function handleSave() {
    const trimmed = keyInput.trim();
    if (trimmed.length < 10) {
      setError("Enter a valid Gemini API key.");
      return;
    }
    onSave(trimmed, modelId, deepBrandSearch);
    onClose();
  }

  function handleClear() {
    onClear();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="byok-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="byok-dialog-title" className="text-lg font-semibold text-slate-900">
          Use your Gemini API key
        </h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Optional — without a key, Naamkaran uses a shared hosted key with daily limits.{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            Get a key
          </a>
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="byok-api-key" className="text-sm font-medium text-slate-700">
              Gemini API key
            </label>
            <input
              id="byok-api-key"
              type="password"
              value={keyInput}
              onChange={(e) => {
                setKeyInput(e.target.value);
                setError(null);
              }}
              placeholder="AIza…"
              autoComplete="off"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="byok-model" className="text-sm font-medium text-slate-700">
              Model
            </label>
            <select
              id="byok-model"
              value={modelId}
              onChange={(e) => setModelId(e.target.value as GeminiModelId)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {GEMINI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-3">
            <input
              type="checkbox"
              checked={deepBrandSearch}
              onChange={(e) => setDeepBrandSearch(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-700">
              <span className="font-medium text-slate-900">Deep brand search</span>
              <span className="mt-0.5 block text-slate-500">
                Slower, multi-angle Google search on your key.
              </span>
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Save
          </button>
          {initialKey ? (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear key
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          Your key is stored only in your browser and sent with each request. We never store it on
          our servers.
        </p>
      </div>
    </div>
  );
}
