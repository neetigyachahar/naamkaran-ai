import { useEffect, useRef, useState } from "react";
import type { ChatMessage, NameGenreId } from "@naamkaran/shared";
import { DEFAULT_GENRE_ID, NAME_GENRES } from "@naamkaran/shared";
import { generateNames } from "../lib/api-client";
import { useByok } from "../lib/byok-context";
import {
  INITIAL_SMART_PICK_STATE,
  type SmartPickState,
  streamSmartPick,
} from "../lib/smart-pick";
import { NameChip } from "./NameChip";
import { SmartPickProgress } from "./SmartPickProgress";
import { SmartPickToggle } from "./SmartPickToggle";

interface ChatTurn extends ChatMessage {
  names?: string[];
  smartPickState?: SmartPickState;
}

interface NameChatProps {
  onNameSelect: (name: string) => void;
  activeName: string | null;
}

export function NameChat({ onNameSelect, activeName }: NameChatProps) {
  const { modelId, apiKey } = useByok();
  const [genreId, setGenreId] = useState<NameGenreId>(DEFAULT_GENRE_ID);
  const [genreLocked, setGenreLocked] = useState(false);
  const [smartPick, setSmartPick] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectedGenre = NAME_GENRES.find((g) => g.id === genreId);
  const busy = loading || scoring;

  useEffect(() => {
    if (!genreLocked) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, loading, scoring, genreLocked]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function updateLastAssistant(patch: Partial<ChatTurn>) {
    setTurns((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, ...patch };
      }
      return next;
    });
  }

  async function sendMessage(content: string) {
    if (!genreId || !content.trim() || busy) return;

    const userTurn: ChatTurn = { role: "user", content: content.trim() };
    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    setInput("");
    setLoading(true);
    setError(null);

    if (!genreLocked) {
      setGenreLocked(true);
    }

    const messages: ChatMessage[] = nextTurns.map(({ role, content: c }) => ({
      role,
      content: c,
    }));

    try {
      if (smartPick) {
        setTurns([
          ...nextTurns,
          {
            role: "assistant",
            content: "Finding strong names for you…",
            smartPickState: {
              ...INITIAL_SMART_PICK_STATE,
              activePhase: "generating",
              generatingMessage: "Starting…",
            },
          },
        ]);
        setLoading(false);
        setScoring(true);

        abortRef.current?.abort();
        abortRef.current = new AbortController();

        await streamSmartPick(
          {
            genreId,
            messages,
            context: context.trim() || undefined,
          },
          modelId,
          (state) => {
            updateLastAssistant({
              content: state.reply ?? "Finding strong names for you…",
              names: state.accepted.map((e) => e.name),
              smartPickState: state,
            });
          },
          abortRef.current.signal,
          apiKey ?? undefined,
        );
      } else {
        const response = await generateNames(
          {
            genreId,
            messages,
            context: context.trim() || undefined,
          },
          modelId,
          apiKey ?? undefined,
        );
        setTurns([
          ...nextTurns,
          { role: "assistant", content: response.reply, names: response.names },
        ]);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to generate names");
      setTurns(nextTurns);
      setInput(content);
    } finally {
      setLoading(false);
      setScoring(false);
    }
  }

  function handleFollowUp(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleSetupSubmit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-white">
      <div className="hidden h-20 shrink-0 flex-col justify-center border-b border-slate-200 px-4 lg:flex">
        <h2 className="font-semibold text-slate-900">Name generator</h2>
        <p className="line-clamp-2 text-sm text-slate-500">
          {genreLocked && selectedGenre
            ? `Style: ${selectedGenre.label}`
            : "Pick a style, describe your idea, get names"}
        </p>
      </div>

      {genreLocked && selectedGenre ? (
        <p className="shrink-0 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-sm text-slate-600 lg:hidden">
          Style: <span className="font-medium text-slate-900">{selectedGenre.label}</span>
        </p>
      ) : null}

      {!genreLocked ? (
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
          <form onSubmit={handleSetupSubmit} className="space-y-4 p-4">
            <SmartPickToggle
              enabled={smartPick}
              onChange={setSmartPick}
              disabled={busy}
            />

            <fieldset>
              <legend className="text-sm font-medium text-slate-700">
                Naming style
              </legend>
              <div className="genre-scroll mt-2 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/80 p-2 sm:max-h-96">
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {NAME_GENRES.map((genre) => {
                    const selected = genreId === genre.id;
                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => setGenreId(genre.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                          selected
                            ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <p className="text-sm font-medium text-slate-900">{genre.label}</p>
                        <p className="mt-1 text-xs leading-snug text-slate-600 line-clamp-2">
                          {genre.description}
                        </p>
                        <p className="mt-1.5 text-xs text-indigo-600">
                          e.g. {genre.example}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>

            <div>
              <label htmlFor="context" className="text-sm font-medium text-slate-700">
                Product context{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="context"
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g. B2B invoicing for Indian SMBs"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label htmlFor="prompt" className="text-sm font-medium text-slate-700">
                What are you building?
              </label>
              <textarea
                id="prompt"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                placeholder="Describe your product, audience, and vibe…"
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={!genreId || !input.trim() || busy}
              className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Generating…" : smartPick ? "Generate & rank names" : "Generate names"}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="shrink-0 border-b border-slate-100 px-4 py-2">
            <SmartPickToggle
              enabled={smartPick}
              onChange={setSmartPick}
              disabled={busy}
            />
          </div>

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="space-y-4">
              {turns.map((turn, i) => (
                <div
                  key={i}
                  className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[95%] rounded-2xl px-4 py-3 text-sm ${
                      turn.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    <p>{turn.content}</p>

                    {turn.smartPickState ? (
                      <SmartPickProgress
                        state={turn.smartPickState}
                        activeName={activeName}
                        onNameSelect={onNameSelect}
                      />
                    ) : (
                      turn.names &&
                      turn.names.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {turn.names.map((name) => (
                            <NameChip
                              key={name}
                              name={name}
                              active={activeName === name}
                              onSelect={() => onNameSelect(name)}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                    Generating ideas…
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
              )}
            </div>
          </div>

          <form
            onSubmit={handleFollowUp}
            className="shrink-0 border-t border-slate-200 bg-white p-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask for more names…"
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                disabled={busy}
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
