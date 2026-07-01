import type { GeminiModelId, SmartPickEvent, SmartPickRequest } from "@naamkaran/shared";
import {
  SMART_PICK_MIN_ACCEPTED,
  SMART_PICK_MIN_SCORE,
  SMART_PICK_REVEAL_COUNT,
} from "@naamkaran/shared";

export function getSmartPickStreamUrl(): string {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (
    import.meta.env.DEV &&
    import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true"
  ) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/smartPickStream`;
  }
  return `https://us-central1-${projectId}.cloudfunctions.net/smartPickStream`;
}

export type PickPhase =
  | "idle"
  | "generating"
  | "considering"
  | "domain"
  | "seo"
  | "scoring";

export interface ScoredNameEntry {
  name: string;
  score: number;
}

export interface SmartPickState {
  reply?: string;
  accepted: ScoredNameEntry[];
  rejected: ScoredNameEntry[];
  activeName: string | null;
  activePhase: PickPhase;
  activeDomainScore: number | null;
  activeSeoScore: number | null;
  activeCompositeScore: number | null;
  generatingMessage: string | null;
  isComplete: boolean;
  summaryMessage: string | null;
  checkedCount: number;
}

export const INITIAL_SMART_PICK_STATE: SmartPickState = {
  accepted: [],
  rejected: [],
  activeName: null,
  activePhase: "idle",
  activeDomainScore: null,
  activeSeoScore: null,
  activeCompositeScore: null,
  generatingMessage: null,
  isComplete: false,
  summaryMessage: null,
  checkedCount: 0,
};

function sortByScore(entries: ScoredNameEntry[]): ScoredNameEntry[] {
  return [...entries].sort((a, b) => b.score - a.score);
}

function clearActive(state: SmartPickState): SmartPickState {
  return {
    ...state,
    activeName: null,
    activePhase: "idle",
    activeDomainScore: null,
    activeSeoScore: null,
    activeCompositeScore: null,
  };
}

function applyEvent(state: SmartPickState, event: SmartPickEvent): SmartPickState {
  switch (event.type) {
    case "reply":
      return { ...state, reply: event.reply };
    case "generating":
      return {
        ...clearActive(state),
        activePhase: "generating",
        generatingMessage: event.message,
      };
    case "considering":
      return {
        ...state,
        generatingMessage: null,
        activeName: event.name,
        activePhase: "considering",
        activeDomainScore: null,
        activeSeoScore: null,
        activeCompositeScore: null,
      };
    case "domain_check":
      if (event.status === "start") {
        return { ...state, activePhase: "domain" };
      }
      return { ...state, activePhase: "domain", activeDomainScore: event.score ?? null };
    case "seo_check":
      if (event.status === "start") {
        return { ...state, activePhase: "seo" };
      }
      return { ...state, activePhase: "seo", activeSeoScore: event.score ?? null };
    case "scored":
      return {
        ...state,
        activePhase: "scoring",
        activeCompositeScore: event.compositeScore,
      };
    case "accepted":
      return {
        ...clearActive(state),
        accepted: sortByScore([
          ...state.accepted,
          { name: event.name, score: event.score },
        ]),
        checkedCount: state.checkedCount + 1,
      };
    case "rejected":
      return {
        ...clearActive(state),
        rejected: sortByScore([
          ...state.rejected,
          { name: event.name, score: event.score },
        ]),
        checkedCount: state.checkedCount + 1,
      };
    case "done": {
      const accepted = sortByScore(
        event.names.map((name) => ({
          name,
          score: event.nameScores[name] ?? 0,
        })),
      );
      const rejected = sortByScore(
        event.rejectedNames.map((name) => ({
          name,
          score: event.nameScores[name] ?? 0,
        })),
      );
      return {
        ...clearActive(state),
        accepted,
        rejected,
        isComplete: true,
        summaryMessage: event.message ?? null,
        checkedCount: accepted.length + rejected.length,
      };
    }
    case "error":
      return {
        ...clearActive(state),
        summaryMessage: event.message,
        isComplete: true,
      };
    default:
      return state;
  }
}

export async function streamSmartPick(
  request: SmartPickRequest,
  modelId: GeminiModelId,
  onUpdate: (state: SmartPickState) => void,
  signal?: AbortSignal,
  apiKey?: string,
): Promise<SmartPickState> {
  let state: SmartPickState = {
    ...INITIAL_SMART_PICK_STATE,
    activePhase: "generating",
    generatingMessage: "Starting smart pick…",
  };
  onUpdate(state);

  const body: SmartPickRequest = { ...request, model: modelId };
  if (apiKey) {
    body.apiKey = apiKey;
  }

  const response = await fetch(getSmartPickStreamUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Smart pick failed (${response.status})`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response stream from server");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6)) as SmartPickEvent;
      state = applyEvent(state, event);
      onUpdate(state);
    }
  }

  return state;
}

export { SMART_PICK_MIN_ACCEPTED, SMART_PICK_MIN_SCORE, SMART_PICK_REVEAL_COUNT };
