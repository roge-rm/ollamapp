// Thinking budget: how many tokens a model may spend reasoning before it answers.
// 0 means auto, so no cap is sent.

export const REASONING_BUDGET_AUTO = 0;
export const REASONING_BUDGET_OPTIONS: readonly number[] = [512, 1024, 2048, 4096, 8192, 16384, 32768];

const capOf = (thinking: boolean, budget: number | null | undefined): number | undefined =>
  thinking && typeof budget === 'number' && Number.isFinite(budget) && budget > 0
    ? Math.floor(budget)
    : undefined;

export function reasoningBudgetLabel(budget: number): string {
  if (!Number.isFinite(budget) || budget <= 0) return 'Auto';
  if (budget >= 1024 && budget % 1024 === 0) return `${budget / 1024}K tokens`;
  return `${budget} tokens`;
}

/** llama.rn completion field. */
export function thinkingBudgetPayload(thinking: boolean, budget: number): { thinking_budget_tokens?: number } {
  const cap = capOf(thinking, budget);
  return cap === undefined ? {} : { thinking_budget_tokens: cap };
}

/** llama-server and compatible OpenAI-style servers. */
export function reasoningBudgetPayload(thinking: boolean, budget: number): { reasoning_budget_tokens?: number } {
  const cap = capOf(thinking, budget);
  return cap === undefined ? {} : { reasoning_budget_tokens: cap };
}

/** OpenRouter's unified reasoning object. */
export function openRouterReasoningPayload(
  thinking: boolean,
  budget: number,
): { reasoning: { enabled?: boolean; max_tokens?: number; effort?: 'none' } } {
  if (!thinking) return { reasoning: { effort: 'none' } };
  const cap = capOf(thinking, budget);
  return cap === undefined ? { reasoning: { enabled: true } } : { reasoning: { max_tokens: cap } };
}
