import type { ChatMessage, GenerateNamesResponse, GeminiModelId } from "@naamkaran/shared";
import type { NameGenreId } from "@naamkaran/shared";
import { DEFAULT_NAME_COUNT, resolveGeminiModelId, SMART_PICK_BATCH_SIZE } from "@naamkaran/shared";
import { getGenreInstruction, resolveNameCount } from "../config/name-genres";
import { getGeminiGenerateUrl } from "../lib/gemini";
import { geminiFetch } from "../lib/gemini-throttle";

function buildSystemPrompt(
  genreId: NameGenreId,
  nameCount: number,
  context?: string,
  smartPick?: boolean,
  excludeNames?: string[],
): string {
  const genreRules = getGenreInstruction(genreId);
  const contextLine = context
    ? `\n\n## User's product / industry context\n${context}\nTailor every name to this context while obeying all genre rules above.`
    : "";

  const smartPickNote = smartPick
    ? `

## Smart pick viability rules (active — every name will be auto-checked)
- Each name is scored for domain availability (.com, .in, etc.) and existing brands via Google search.
- Only names scoring 60+ are kept. Favor names likely to pass:
  - Coined or altered spellings — not plain dictionary words big companies already own.
  - No overlap with known products, apps, startups, or brands in the user's space.
  - Prefer names where major TLDs are likely unregistered — creative twists help.
  - Avoid homophones or near-matches of famous brands (e.g. don't suggest "Lyft" variants).
- Generate a diverse candidate pool (${nameCount} names) — variety matters since many will be filtered out.`
    : "";

  const excludeNote =
    excludeNames && excludeNames.length > 0
      ? `\n- Do NOT repeat these already-tried names: ${excludeNames.join(", ")}`
      : "";

  const countRule =
    nameCount < DEFAULT_NAME_COUNT
      ? `Suggest exactly ${nameCount} names (user requested fewer this turn).`
      : `Suggest at least ${nameCount} names — never fewer unless the user explicitly asked for a smaller number this turn.`;

  return `${genreRules}${contextLine}

## Output rules (every response)
- ${countRule}${smartPickNote}${excludeNote}
- Every name must be unique vs all names you suggested in earlier turns in this conversation.
- Stay strictly within the genre pattern — reject ideas that drift into other genres.
- If the user gives follow-up feedback, refine within the same genre rules.
- reply: 1–2 friendly sentences explaining the batch or responding to feedback.
- names: array of strings — each a single brand name (no taglines, no domains, no explanations per name).

Respond ONLY with valid JSON (no markdown fences):
{"reply": "...", "names": ["Name1", "Name2", ...]}`;
}

function parseResponse(text: string, minCount: number): GenerateNamesResponse {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? cleaned) as {
    reply?: string;
    names?: string[];
  };

  const names = (parsed.names ?? [])
    .map((n) => String(n).trim())
    .filter((n) => n.length > 0 && n.length <= 50)
    .slice(0, Math.max(minCount, 20));

  return {
    reply: String(parsed.reply || "Here are some name ideas for you."),
    names,
  };
}

export async function generateNames(
  genreId: NameGenreId,
  messages: ChatMessage[],
  apiKey: string,
  context?: string,
  smartPick?: boolean,
  excludeNames?: string[],
  modelId?: GeminiModelId,
): Promise<GenerateNamesResponse> {
  const model = resolveGeminiModelId(modelId);
  const nameCount = smartPick
    ? SMART_PICK_BATCH_SIZE
    : resolveNameCount(messages);
  const systemPrompt = buildSystemPrompt(
    genreId,
    nameCount,
    context,
    smartPick,
    excludeNames,
  );

  const contents = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  const response = await geminiFetch(`${getGeminiGenerateUrl(model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { responseMimeType: "application/json" },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned no content");
  }

  return parseResponse(text, nameCount);
}
