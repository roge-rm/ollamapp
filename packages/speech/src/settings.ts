/**
 * How a voice turn begins and ends.
 *  - 'tap'       you start it and you stop it
 *  - 'silence'   you start it, it ends when you stop talking
 *  - 'handsfree' it starts when you talk and ends when you stop
 */
export type VoiceTurnMode = 'tap' | 'silence' | 'handsfree';

export const VOICE_TURN_LABELS: Record<VoiceTurnMode, { label: string; description: string }> = {
  tap: { label: 'Tap', description: 'Tap to start and tap to stop' },
  silence: { label: 'Auto stop', description: 'Tap to start, stops when you stop talking' },
  handsfree: { label: 'Hands-free', description: 'Starts when you talk, stops when you stop' },
};

export const VOICE_DELAY_LABELS = {
  silenceAfterSpeech: {
    label: 'Silence before stop',
    description: 'How long you can pause before the turn ends',
  },
  speakerDrain: {
    label: 'Pause after reply',
    description: 'Wait before listening again, so the end of the reply is not picked up',
  },
} as const;

/** Quiet after speech that ends a turn, in ms. */
export const DEFAULT_SILENCE_AFTER_SPEECH_MS = 1_500;
export const SILENCE_AFTER_SPEECH_CHOICES_MS = [800, 1_000, 1_500, 2_000, 3_000] as const;

/** Wait after the reply finishes playing before the mic opens again, in ms. */
export const DEFAULT_SPEAKER_DRAIN_MS = 500;
export const SPEAKER_DRAIN_CHOICES_MS = [0, 250, 500, 1_000, 1_500] as const;

/** 1500 -> "1.5s", 1000 -> "1s". */
export function secondsLabel(ms: number): string {
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds}s`;
}
