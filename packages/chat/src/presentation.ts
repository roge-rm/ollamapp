import { stripChatControlTokens } from './parse';

// The "Enhanced prompt" card is a labelled thinking block the app writes before an image.
export const PROMPT_ENHANCEMENT_REASONING_LABEL = 'Enhanced prompt';
export const PROMPT_ENHANCEMENT_STATUS = 'Enhancing your prompt…';

/** Escape `*` between digits so `5*5` reads as maths, not emphasis. */
export function preprocessChatMarkdown(text: string): string {
  return text.replaceAll(/(\d)\*(?=\d)/g, String.raw`$1\*`);
}

const SAFE_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

/** The URL to open for a tapped chat link, or null for anything but web and mail links. */
export function safeChatExternalUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  const scheme = /^([a-z][a-z\d+.-]*:)/i.exec(trimmed)?.[1]?.toLowerCase();
  if (!scheme || !SAFE_LINK_SCHEMES.has(scheme)) return null;
  if (scheme !== 'mailto:' && !/^https?:\/\/[^\s/?#]+/i.test(trimmed)) return null;
  return trimmed;
}

export interface SupportingChatContextInput {
  answer: string | null | undefined;
  reasoning: string | null | undefined;
  reasoningLabel?: string | null;
}

/**
 * A labelled block the app wrote (the enhanced prompt) with no answer of its own. It is shown
 * alongside the result it supports rather than as a reply.
 */
export function isSupportingChatContext(input: SupportingChatContextInput): boolean {
  return Boolean(
    input.reasoningLabel &&
      input.reasoning?.trim() &&
      !input.answer?.trim(),
  );
}

export interface RuntimeOnlyMessageInput {
  role: string;
  content: string | null | undefined;
  /** Set on messages the app adds as notices, such as "Model loaded". */
  notice?: boolean;
}

// Notices about this device's state. Written wrapped in `_..._` for italics.
const RUNTIME_NOTICE_PATTERNS: RegExp[] = [
  /^Model loaded\b/i,
  /^Unloaded \d+ models?\b/i,
  /^Loading .+(?:\.\.\.|…)$/i,
  /^Compacted conversation\b/i,
];

/** Whether a message is a runtime notice rather than part of the conversation. */
export function isRuntimeOnlyMessage(message: RuntimeOnlyMessageInput): boolean {
  if (message.notice) return true;
  if (message.role !== 'assistant' && message.role !== 'system') return false;
  const text = (message.content ?? '').trim().replace(/^_(.*)_$/s, '$1').trim();
  if (!text) return false;
  return RUNTIME_NOTICE_PATTERNS.some(pattern => pattern.test(text));
}

const PREVIEW_MAX_CHARS = 120;

/** The one-line summary of a conversation's last message for chat lists. Empty when there is none. */
export function chatListPreviewLine(
  role: string | null | undefined,
  content: string | null | undefined,
): string {
  if (!content) return '';
  const text = stripChatControlTokens(content)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return '';
  const clipped =
    text.length > PREVIEW_MAX_CHARS
      ? `${text.slice(0, PREVIEW_MAX_CHARS - 1).trimEnd()}…`
      : text;
  return role === 'user' ? `You: ${clipped}` : clipped;
}

// Live previews of a reply generating on another device. Kept so chat screen types still
// compile; nothing in this build produces them.
/** A fraction from 0 to 1, or a step count while an image generates. */
export type ChatStreamProgress = number | { current: number; total: number } | null;

export type ChatStreamPhase =
  | 'waiting'
  | 'loading'
  | 'loading_model'
  | 'loading_image_model'
  | 'generating_image'
  | 'thinking'
  | 'enhancing'
  | 'generating'
  | 'acting'
  | 'answering'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ChatStreamTool {
  name: string;
  result?: string;
  status: 'running' | 'completed' | 'failed';
}

export interface ChatStreamPreviewRow {
  id: string;
  messageId: string;
  conversationId?: string;
  deviceId: string;
  phase: ChatStreamPhase;
  progress?: ChatStreamProgress;
  content: string;
  reasoning?: string | null;
  tools?: ChatStreamTool[];
}

export type ChatStreamPreview = ChatStreamPreviewRow;

const STATUS_PHASES = new Set<ChatStreamPhase>([
  'waiting',
  'loading',
  'loading_model',
  'loading_image_model',
  'generating_image',
  'enhancing',
]);

/** Phases that describe what the device is doing rather than carrying reply text. */
export function chatStreamPhaseIsStatus(phase: ChatStreamPhase): boolean {
  return STATUS_PHASES.has(phase);
}

/** A short label for a preview's phase, or null when the text speaks for itself. */
export function chatStreamPhaseLabel(
  phase: ChatStreamPhase,
  progress?: ChatStreamProgress,
): string | null {
  switch (phase) {
    case 'waiting':
      return 'Preparing reply...';
    case 'loading':
    case 'loading_model':
      return typeof progress === 'number'
        ? `Loading model... ${Math.round(progress * 100)}%`
        : 'Loading model...';
    case 'loading_image_model':
      return 'Loading image model...';
    case 'generating_image':
      return progress && typeof progress === 'object'
        ? `Generating image... ${progress.current}/${progress.total}`
        : 'Generating image...';
    case 'enhancing':
      return PROMPT_ENHANCEMENT_STATUS;
    case 'thinking':
      return 'Thinking...';
    default:
      return null;
  }
}

/** Whether a preview has answer text to show yet. */
export function chatStreamPreviewHasMessageBody(preview: {
  content?: string | null;
}): boolean {
  // A frame with only punctuation (a " - " placeholder) carries no answer yet.
  return /[\p{L}\p{N}]/u.test(preview.content ?? '');
}
