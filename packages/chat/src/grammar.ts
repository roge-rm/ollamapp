// Delimiters models use for tool calls and reasoning. The app's streaming filters and the
// stored-content stripper both build their patterns from these lists.

// Gemma-native tool-call blocks. Any closer can end any opener.
export const TOOL_CALL_OPENERS: readonly string[] = [
  '<|tool_call>',
  '<tool_call:',
  '<tool_call>',
];
export const TOOL_CALL_CLOSERS: readonly string[] = ['<tool_call|>', '</tool_call>'];

// XML-style tool calls: `<function=NAME><parameter=NAME>...</function>`. Regex sources, with the
// name as the first capture group.
export const XML_TOOL_CALL_FUNCTION_MARKER = String.raw`<function=(\w+)>`;
export const XML_TOOL_CALL_PARAMETER_MARKER = String.raw`<parameter=(\w+)>`;
export const XML_TOOL_CALL_FUNCTION_CLOSER = '</function>';

export interface ReasoningDelimiter {
  open: string;
  close: string;
}

// Longest opener first, so `<|channel|>analysis` wins over `<|channel>thought`. The Gemma opener
// is bare: the newline after it is optional and gets trimmed from the reasoning.
export const REASONING_DELIMITERS: readonly ReasoningDelimiter[] = [
  {
    open: '<|channel|>analysis<|message|>',
    close: '<|channel|>final<|message|>',
  },
  { open: '<|channel>thought', close: '<channel|>' },
  { open: '<think>', close: '</think>' },
];

/**
 * How many characters at the end of `text` could be the start of `tag`, so a streaming parser
 * can hold them back until the next chunk shows whether the tag is real.
 */
export function partialTagSuffix(text: string, tag: string): number {
  for (let len = Math.min(tag.length - 1, text.length); len > 0; len--) {
    if (text.endsWith(tag.slice(0, len))) return len;
  }
  return 0;
}

/** The longest partial-tag suffix across several tags. */
export function maxPartialTagSuffix(text: string, tags: readonly string[]): number {
  return tags.reduce(
    (max, tag) => Math.max(max, partialTagSuffix(text, tag)),
    0,
  );
}
