/**
 * Decides from mic loudness when a spoken turn is over.
 *
 * Each buffer's RMS is compared with an adapting noise floor. The turn ends after a chosen
 * stretch of quiet following speech. Outside hands-free it also ends if nobody speaks at all
 * for a while; in hands-free it waits for speech as long as it takes.
 */

/** Loudness only shows speech has started about this long after it really did. */
export const SPEECH_ONSET_LOOKBACK_MS = 300;

/** Quiet kept at the end of a turn so the last word isn't clipped. */
const HANGOVER_MS = 300;

/** Give up on a tapped turn nobody spoke in. */
const SILENCE_BEFORE_SPEECH_MS = 8_000;

const DEFAULT_SILENCE_AFTER_SPEECH_MS = 1_500;

// Speech is this far above the floor. The margin stops a near-silent room hearing its own hiss.
const SPEECH_OVER_FLOOR = 3;
const SPEECH_FLOOR_MARGIN = 0.006;

// The floor follows quiet quickly and loud slowly, and never rises during speech.
const FLOOR_FALL = 0.25;
const FLOOR_RISE = 0.02;

/** Re-check on a timer too, in case a device stops sending buffers. */
const CHECK_EVERY_MS = 250;

export interface SpeechEndpointReading {
  speech: boolean;
  floor: number;
}

export interface SpeechEndpointOptions {
  handsFree?: boolean;
  silenceAfterSpeechMs?: number;
}

export class SpeechEndpointTimer {
  private floor: number | null = null;
  private heardSpeech = false;
  private lastSpeechAt = 0;
  private startedAt = 0;
  private handsFree = false;
  private silenceAfterSpeechMs = DEFAULT_SILENCE_AFTER_SPEECH_MS;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ended = true;
  private levelLogAt = 0;

  private readonly onEnded: () => void;
  private readonly log: (line: string) => void;

  constructor(onEnded: () => void, log: (line: string) => void = () => undefined) {
    this.onEnded = onEnded;
    this.log = log;
  }

  /** A turn has started. Nothing has been heard yet. */
  begin(now: number = Date.now(), options: SpeechEndpointOptions = {}): void {
    this.handsFree = options.handsFree ?? false;
    const silence = options.silenceAfterSpeechMs;
    this.silenceAfterSpeechMs =
      silence !== undefined && Number.isFinite(silence) && silence > 0
        ? silence
        : DEFAULT_SILENCE_AFTER_SPEECH_MS;
    this.log(
      `[VAD] begin handsFree=${this.handsFree} silenceAfterSpeechMs=${this.silenceAfterSpeechMs}`,
    );
    this.levelLogAt = 0;
    this.floor = null;
    this.heardSpeech = false;
    this.lastSpeechAt = 0;
    this.startedAt = now;
    this.ended = false;
    this.clear();
    this.timer = setInterval(() => this.check(Date.now()), CHECK_EVERY_MS);
  }

  /** One buffer of mic loudness. */
  observeLevel(rms: number, now: number = Date.now()): SpeechEndpointReading {
    if (!Number.isFinite(rms) || rms < 0) return { speech: false, floor: this.floor ?? 0 };
    if (this.floor === null) this.floor = rms;
    // Classified against the floor before it moves.
    const speech = rms > this.floor * SPEECH_OVER_FLOOR + SPEECH_FLOOR_MARGIN;
    const alpha = rms < this.floor ? FLOOR_FALL : speech ? 0 : FLOOR_RISE;
    this.floor += alpha * (rms - this.floor);
    if (now - this.levelLogAt >= 1_000) {
      this.levelLogAt = now;
      this.log(
        `[VAD] rms=${rms.toFixed(4)} floor=${this.floor.toFixed(4)} speech=${speech} heard=${this.heardSpeech}`,
      );
    }
    if (speech) {
      this.heardSpeech = true;
      this.lastSpeechAt = now;
    }
    return { speech, floor: this.floor };
  }

  /** Whether the turn should end now. */
  hasEnded(now: number = Date.now()): boolean {
    if (this.heardSpeech) return now - this.lastSpeechAt >= this.silenceAfterSpeechMs;
    return !this.handsFree && now - this.startedAt >= SILENCE_BEFORE_SPEECH_MS;
  }

  hasHeardSpeech(): boolean {
    return this.heardSpeech;
  }

  /** Seconds of quiet since the last speech, less the hangover. 0 if nobody spoke. */
  quietTailSeconds(now: number = Date.now()): number {
    if (!this.heardSpeech) return 0;
    const quietMs = now - this.lastSpeechAt - HANGOVER_MS;
    return quietMs > 0 ? quietMs / 1000 : 0;
  }

  /** Forget the turn, however it stopped. */
  cancel(): void {
    this.clear();
    this.ended = true;
  }

  private check(now: number): void {
    if (this.ended || !this.hasEnded(now)) return;
    this.log(`[VAD] ending turn heardSpeech=${this.heardSpeech}`);
    this.ended = true;
    this.clear();
    this.onEnded();
  }

  private clear(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}
