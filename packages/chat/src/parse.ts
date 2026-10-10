import {
  TOOL_CALL_CLOSERS,
  TOOL_CALL_OPENERS,
  XML_TOOL_CALL_FUNCTION_CLOSER,
  XML_TOOL_CALL_FUNCTION_MARKER,
} from './grammar';

export interface ParsedChatThinking {
  thinking: string | null;
  response: string;
  isThinkingComplete: boolean;
  thinkingLabel?: string;
}

export interface ParsedChatModelOutput {
  /** Reasoning from any format (separate channel, <think>, Gemma or Qwen channel), or null. */
  reasoning: string | null;
  /** The visible answer, with reasoning, control tokens and tool-call markup removed. */
  answer: string;
  isReasoningComplete: boolean;
  reasoningLabel?: string;
}

const escapeRegExp = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

const CLOSERS_ALT = TOOL_CALL_CLOSERS.map(escapeRegExp).join('|');
const TOOL_CALL_BLOCK_PATTERNS: RegExp[] = TOOL_CALL_OPENERS.map(
  open =>
    new RegExp(
      String.raw`${escapeRegExp(open)}[\s\S]*?(?:${CLOSERS_ALT})\s*`,
      'g',
    ),
);
// An opener with no closer means the model stopped mid tool call; drop everything after it.
const TOOL_CALL_UNCLOSED_PATTERNS: RegExp[] = TOOL_CALL_OPENERS.map(
  open => new RegExp(String.raw`${escapeRegExp(open)}[\s\S]*$`),
);
const XML_TOOL_CALL_BLOCK_PATTERN = new RegExp(
  String.raw`${XML_TOOL_CALL_FUNCTION_MARKER}[\s\S]*?${escapeRegExp(
    XML_TOOL_CALL_FUNCTION_CLOSER,
  )}\s*`,
  'gi',
);
const XML_TOOL_CALL_UNCLOSED_PATTERN = new RegExp(
  String.raw`${XML_TOOL_CALL_FUNCTION_MARKER}[\s\S]*$`,
  'i',
);

const CONTROL_TOKEN_PATTERNS: RegExp[] = [
  /<\|im_start\|>\s*(?:system|assistant|user|tool)?\s*\n?/gi,
  /<\|im_end\|>\s*\n?/gi,
  /<\|end\|>/gi,
  /<\|eot_id\|>/gi,
  /<\/s>/gi,
  ...TOOL_CALL_BLOCK_PATTERNS,
  XML_TOOL_CALL_BLOCK_PATTERN,
  // Gemma 4 string delimiter that can turn up outside a tool block.
  /<\|">/g,
];

const CHANNEL_ANALYSIS_START = /<\|channel\|>analysis<\|message\|>/gi;
const CHANNEL_FINAL_START = /<\|channel\|>final<\|message\|>/gi;

// Gemma 4: `<|channel>thought`, an optional newline, the thought, then `<channel|>`. The newline is
// missing when the thought is empty and the model goes straight to a tool call.
const GEMMA4_THINK_OPEN_SRC = String.raw`<\|channel>thought\n?`;
const GEMMA4_THINK_CLOSE_SRC = String.raw`<channel\|>`;
const GEMMA4_THINK_OPEN = new RegExp(GEMMA4_THINK_OPEN_SRC, 'gi');
const GEMMA4_THINK_CLOSE = new RegExp(GEMMA4_THINK_CLOSE_SRC, 'gi');

// Any XML-ish tag whose name mentions tool calls, invoke, function calls or parameters.
const TOOLISH_TAG = String.raw`<\/?(?:[\w:-]*(?:tool_call|invoke|function_call|parameters?)[\w:-]*)(?:\s[^>]*)?>`;
const TOOLISH_BLOCK = new RegExp(
  String.raw`${TOOLISH_TAG}[\s\S]*?(?=${TOOLISH_TAG}|$)`,
  'gi',
);
const TOOLISH_PAIRED = /<([\w:-]*(?:tool_call|invoke|function_call)[\w:-]*)[\s\S]*?<\/\1>/gi;

/**
 * Strip control tokens, tool-call markup and thinking blocks from finished content. Use it only
 * where reasoning has already been pulled out, since it removes thinking too.
 */
export function stripChatControlTokens(content: string): string {
  let result = CONTROL_TOKEN_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, ''),
    content,
  );
  // Channel markers go, the text after them stays.
  result = result.replace(CHANNEL_ANALYSIS_START, '');
  result = result.replace(CHANNEL_FINAL_START, '');
  result = result.replace(GEMMA4_THINK_OPEN, '');
  result = result.replace(GEMMA4_THINK_CLOSE, '');

  // Tool calls from other providers (minimax, anthropic, generic). These blocks never hold text
  // meant for the user.
  result = result.replace(TOOLISH_BLOCK, '');
  result = result.replace(TOOLISH_PAIRED, '');
  // Bare `namespace:tag` lines such as "minimax:tool_call".
  result = result.replace(/^\w+:\w+\s*$/gm, '');
  result = TOOL_CALL_UNCLOSED_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, ''),
    result,
  );
  result = result.replace(XML_TOOL_CALL_UNCLOSED_PATTERN, '');

  result = result.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // A streaming parser can eat `<think>` and leave the thought and `</think>` behind.
  result = result.replace(/^[\s\S]*?<\/think>\s*/i, '');
  result = result.replace(/<\/?think>/gi, '');

  return result.trim();
}

/** Gemma 4 thinking, or null when absent. */
function parseGemmaThinking(content: string): ParsedChatThinking | null {
  const open = new RegExp(GEMMA4_THINK_OPEN_SRC, 'i').exec(content);
  if (!open) return null;
  const thinkStart = open.index + open[0].length;
  const close = new RegExp(GEMMA4_THINK_CLOSE_SRC, 'i').exec(content);
  if (close && close.index >= thinkStart) {
    return {
      thinking: content.slice(thinkStart, close.index).trim(),
      response: content.slice(close.index + close[0].length).trim(),
      isThinkingComplete: true,
    };
  }
  return {
    thinking: content.slice(thinkStart).trim(),
    response: '',
    isThinkingComplete: false,
  };
}

/** Qwen-style channels: `<|channel|>analysis<|message|>` thought `<|channel|>final<|message|>` answer. */
function parseChannelThinking(content: string): ParsedChatThinking | null {
  const analysis = /<\|channel\|>analysis<\|message\|>/i.exec(content);
  if (!analysis) return null;
  const analysisStart = analysis.index + analysis[0].length;
  const final = /<\|channel\|>final<\|message\|>/i.exec(content);
  if (!final || final.index < analysisStart) {
    return {
      thinking: content.slice(analysisStart).trim(),
      response: '',
      isThinkingComplete: false,
    };
  }
  return {
    thinking: content.slice(analysisStart, final.index).trim(),
    response: content.slice(final.index + final[0].length).trim(),
    isThinkingComplete: true,
  };
}

/**
 * `<think>...</think>`, the fallback that always returns. Handles a missing opener (a chat
 * template can swallow it) and a leading `__LABEL:name__` that names an app-made block.
 */
function parseThinkTags(content: string): ParsedChatThinking {
  const startM = /<think>/i.exec(content);
  const endM = /<\/think>/i.exec(content);
  if (!startM) {
    if (endM) {
      const thinking = content.slice(0, endM.index).trim();
      if (thinking) {
        return {
          thinking,
          response: content.slice(endM.index + endM[0].length).trim(),
          isThinkingComplete: true,
        };
      }
    }
    return { thinking: null, response: content, isThinkingComplete: true };
  }
  const thinkStart = startM.index + startM[0].length;
  if (!endM) {
    return {
      thinking: content.slice(thinkStart),
      response: '',
      isThinkingComplete: false,
    };
  }
  let thinking = content.slice(thinkStart, endM.index).trim();
  const response = content.slice(endM.index + endM[0].length).trim();
  let thinkingLabel: string | undefined;
  const labelMatch = /^__LABEL:(.+?)__\n*/.exec(thinking);
  if (labelMatch) {
    thinkingLabel = labelMatch[1];
    thinking = thinking.slice(labelMatch[0].length).trim();
  }
  return { thinking, response, isThinkingComplete: true, thinkingLabel };
}

/** Split reasoning from the response, trying Gemma, then Qwen channels, then <think>. */
export function parseChatThinkingContent(content: string): ParsedChatThinking {
  return (
    parseGemmaThinking(content) ??
    parseChannelThinking(content) ??
    parseThinkTags(content)
  );
}

/**
 * The one display parse for raw model output. With a separate reasoning channel, `content` is
 * the answer. A labelled block was written by the app itself, so its own text wins over the
 * channel.
 */
export function parseChatModelOutput(
  content: string,
  reasoningContent?: string | null,
): ParsedChatModelOutput {
  const p = parseChatThinkingContent(content);
  if (reasoningContent && !p.thinkingLabel) {
    const answer = stripChatControlTokens(content)
      .replaceAll(/<\/?think>/gi, '')
      .trim();
    // Reasoning counts as done once the answer has started.
    return {
      reasoning: reasoningContent,
      answer,
      isReasoningComplete: answer.length > 0,
    };
  }
  // Only the response slice is cleaned; an empty slice stays empty so reasoning isn't repeated.
  const answer = p.response ? stripChatControlTokens(p.response) : '';
  return {
    reasoning: p.thinking,
    answer,
    isReasoningComplete: p.isThinkingComplete,
    reasoningLabel: p.thinkingLabel,
  };
}

export interface InlineReasoning {
  answer: string;
  reasoning: string | null;
  reasoningLabel?: string;
}

/** Reasoning written inline in a stored message's content, split from its answer. */
export function splitInlineReasoning(
  content: string | null | undefined,
): InlineReasoning {
  const parsed = parseChatModelOutput(content ?? '');
  return {
    answer: parsed.answer,
    reasoning: parsed.reasoning?.trim() ? parsed.reasoning : null,
    ...(parsed.reasoningLabel ? { reasoningLabel: parsed.reasoningLabel } : {}),
  };
}
