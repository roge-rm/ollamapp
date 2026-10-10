// Limits for the tool-call loop and the size of tool results fed back to the model.

export const MIN_MAX_TOOL_CALLS = 1;
export const MAX_MAX_TOOL_CALLS = 50;
export const DEFAULT_MAX_TOOL_CALLS = 25;

/** Hard cap on one tool result, in characters. About 6k tokens. */
export const MAX_TOOL_RESULT_CHARS = 24000;

/** Smallest result budget we hand out, so a nearly full context still gets something useful. */
const MIN_TOOL_RESULT_CHARS = 1000;
/** Rough characters per token, used for all budget maths here. */
const CHARS_PER_TOKEN = 4;

/** Clamp a stored or typed setting to a whole number within range, falling back to the default. */
export function normalizeMaxToolCalls(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (value === null || value === undefined || !Number.isFinite(n)) return DEFAULT_MAX_TOOL_CALLS;
  return Math.min(MAX_MAX_TOOL_CALLS, Math.max(MIN_MAX_TOOL_CALLS, Math.round(n)));
}

/** The calls from this round that still fit under the per-response limit, in order. */
export function callsWithinToolBudget<T>(calls: readonly T[], usedSoFar: number, maximum: number): T[] {
  const room = Math.max(0, normalizeMaxToolCalls(maximum) - Math.max(0, usedSoFar));
  return calls.slice(0, room);
}

/** System instruction sent once the tool limit is reached. */
export function toolLimitFinalAnswerInstruction(maximum: number): string {
  const n = normalizeMaxToolCalls(maximum);
  return `You have used the maximum of ${n} tool call${n === 1 ? '' : 's'} for this response. ` +
    'Do not call any more tools. Answer the user now using the tool results you already have.';
}

/** Plain-text answer built from completed tool results, after any text already written. */
export function finalResponseFromToolResults(prefix: string, results: readonly string[]): string {
  const parts = [prefix.trim(), ...results.map(r => r.trim())].filter(Boolean);
  return parts.join('\n\n');
}

function messageChars(message: unknown): number {
  if (typeof message === 'string') return message.length;
  if (!message || typeof message !== 'object') return 0;
  const m = message as Record<string, unknown>;
  let chars = typeof m.content === 'string' ? m.content.length : 0;
  if (m.content && typeof m.content !== 'string') chars += JSON.stringify(m.content).length;
  const calls = m.toolCalls ?? m.tool_calls;
  if (calls) chars += JSON.stringify(calls).length;
  // Role and template markers per message.
  return chars + 8;
}

/** Approximate prompt size in characters: message text, tool calls and tool schemas. */
export function toolPromptChars(messages: readonly unknown[], tools: readonly unknown[] = []): number {
  let chars = 0;
  for (const message of messages) chars += messageChars(message);
  if (tools.length) chars += JSON.stringify(tools).length;
  return chars;
}

/** How many characters one tool result may take, given what is left of the context window. */
export function toolResultCharBudget(input: {
  contextLength?: number | null;
  promptChars: number;
  replyReserveTokens?: number | null;
}): number {
  const context = Number(input.contextLength);
  if (!Number.isFinite(context) || context <= 0) return MAX_TOOL_RESULT_CHARS;
  const reserve = Math.max(0, Number(input.replyReserveTokens) || 0);
  const freeTokens = context - Math.ceil(Math.max(0, input.promptChars) / CHARS_PER_TOKEN) - reserve;
  // Leave a little room for the tool message wrapper and template.
  const chars = Math.floor(freeTokens * CHARS_PER_TOKEN * 0.9);
  return Math.min(MAX_TOOL_RESULT_CHARS, Math.max(MIN_TOOL_RESULT_CHARS, chars));
}

/** Keep the head of an oversized result and say it was cut. Results within the cap come back unchanged. */
export function boundToolResult(name: string, content: string, maxChars: number = MAX_TOOL_RESULT_CHARS): string {
  const text = content ?? '';
  const limit = Math.max(0, Math.floor(maxChars));
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n\n[Tool "${name}" result truncated: showing the first ${limit} of ${text.length} characters.]`;
}
