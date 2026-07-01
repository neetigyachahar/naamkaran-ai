import type { ChatMessage, GeminiModelId, NameGenreId, SmartPickEvent } from "@naamkaran/shared";
import {
  resolveGeminiModelId,
  SMART_PICK_MAX_CANDIDATES,
  SMART_PICK_MIN_ACCEPTED,
  SMART_PICK_MIN_DOMAIN_SCORE,
  SMART_PICK_MIN_SCORE,
  SMART_PICK_REVEAL_COUNT,
} from "@naamkaran/shared";
import { analyzeNameWithProgress } from "../orchestrator";
import { generateNames } from "./name-generation";

type Emit = (event: SmartPickEvent) => void;

export async function runSmartPickStream(
  genreId: NameGenreId,
  messages: ChatMessage[],
  apiKey: string,
  context: string | undefined,
  emit: Emit,
  modelId?: GeminiModelId,
): Promise<void> {
  const model = resolveGeminiModelId(modelId);
  const tried = new Set<string>();
  const accepted: string[] = [];
  const rejected: string[] = [];
  const nameScores: Record<string, number> = {};
  let replySent = false;
  let candidateQueue: string[] = [];

  while (
    tried.size < SMART_PICK_MAX_CANDIDATES &&
    accepted.length < SMART_PICK_REVEAL_COUNT
  ) {
    if (candidateQueue.length === 0) {
      const shouldGenerateMore =
        tried.size === 0 ||
        accepted.length < SMART_PICK_MIN_ACCEPTED ||
        accepted.length < SMART_PICK_REVEAL_COUNT;

      if (!shouldGenerateMore) break;

      if (tried.size > 0) {
        emit({
          type: "generating",
          message: `Thinking of more names (${accepted.length} strong so far)…`,
        });
      }

      const batch = await generateNames(
        genreId,
        messages,
        apiKey,
        context,
        true,
        [...tried],
        model,
      );

      if (!replySent) {
        emit({ type: "reply", reply: batch.reply });
        replySent = true;
      }

      candidateQueue = batch.names
        .map((name) => name.trim())
        .filter((name) => name.length > 0 && !tried.has(name));

      if (candidateQueue.length === 0) {
        if (accepted.length >= SMART_PICK_MIN_ACCEPTED) break;
        continue;
      }
    }

    const name = candidateQueue.shift()!;
    tried.add(name);
    emit({ type: "considering", name });

    try {
      const result = await analyzeNameWithProgress(
        name,
        { googleAiKey: apiKey },
        context,
        (step) => {
          if (step.type === "domain_start") {
            emit({ type: "domain_check", name, status: "start" });
          } else if (step.type === "domain_done") {
            emit({
              type: "domain_check",
              name,
              status: "done",
              score: step.domain.score,
            });
          } else if (step.type === "seo_start") {
            emit({ type: "seo_check", name, status: "start" });
          } else if (step.type === "seo_done") {
            emit({
              type: "seo_check",
              name,
              status: "done",
              score: step.seo.score,
            });
          }
        },
        model,
        { skipSeoIfDomainBelow: SMART_PICK_MIN_DOMAIN_SCORE },
      );

      const score = result.compositeScore;
      const skippedBrandSearch = result.domain.score < SMART_PICK_MIN_DOMAIN_SCORE;
      nameScores[name] = score;

      if (!skippedBrandSearch) {
        emit({ type: "scored", name, compositeScore: score });
      }

      if (score >= SMART_PICK_MIN_SCORE) {
        accepted.push(name);
        emit({ type: "accepted", name, score });
      } else {
        rejected.push(name);
        emit({ type: "rejected", name, score });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed";
      emit({ type: "error", message: `${name}: ${message}` });
    }
  }

  const message =
    accepted.length < SMART_PICK_MIN_ACCEPTED
      ? `Found ${accepted.length} strong name${accepted.length === 1 ? "" : "s"} (target was ${SMART_PICK_MIN_ACCEPTED}+ at ${SMART_PICK_MIN_SCORE}+).`
      : undefined;

  const sortByScore = (names: string[]) =>
    [...names].sort((a, b) => (nameScores[b] ?? 0) - (nameScores[a] ?? 0));

  emit({
    type: "done",
    names: sortByScore(accepted),
    rejectedNames: sortByScore(rejected),
    nameScores,
    message,
  });
}
