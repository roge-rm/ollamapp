// Download progress shared by every view: a safe percentage, byte counts and a measured rate.
// Unknown values stay undefined so no view shows NaN or a made-up total.

export interface ProgressLike {
  /** Fraction done, 0 to 1. Used when the byte total is unknown. */
  progress?: number;
  bytesDownloaded?: number;
  totalBytes?: number;
  bytesPerSecond?: number;
  status?: string;
}

export interface ProgressPresentation {
  currentBytes: number;
  totalBytes?: number;
  /** 0 to 100. */
  percentage?: number;
  bytesPerSecond?: number;
  status?: string;
  /** Completed, failed or cancelled: nothing is moving any more. */
  terminal: boolean;
}

export interface ProgressRateSample {
  currentBytes: number;
  sampledAtMs: number;
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

const finiteNonNegative = (value: number | undefined): number | undefined =>
  value !== undefined && Number.isFinite(value) && value >= 0 ? value : undefined;

const clampPercentage = (value: number): number => Math.min(100, Math.max(0, value));

export function projectProgress(input: ProgressLike): ProgressPresentation {
  const currentBytes = finiteNonNegative(input.bytesDownloaded) ?? 0;
  const total = finiteNonNegative(input.totalBytes);
  const totalBytes = total !== undefined && total > 0 ? total : undefined;
  const terminal = input.status !== undefined && TERMINAL_STATUSES.has(input.status);
  const fraction = finiteNonNegative(input.progress);

  let percentage: number | undefined;
  if (input.status === 'completed') percentage = 100;
  else if (totalBytes !== undefined) percentage = clampPercentage((currentBytes / totalBytes) * 100);
  else if (fraction !== undefined) percentage = clampPercentage(fraction * 100);

  // A finished or stopped download has no live rate.
  const bytesPerSecond = terminal ? undefined : finiteNonNegative(input.bytesPerSecond);

  return { currentBytes, totalBytes, percentage, bytesPerSecond, status: input.status, terminal };
}

/**
 * Rate between the previous sample and this one, in bytes per second. The first sample, or one
 * that goes back in time or bytes, starts over with no rate.
 */
export function sampleProgressRate(
  previous: ProgressRateSample | undefined,
  next: ProgressRateSample,
): { sample: ProgressRateSample; bytesPerSecond?: number } {
  const sample = { currentBytes: next.currentBytes, sampledAtMs: next.sampledAtMs };
  if (!previous) return { sample };
  const elapsedMs = next.sampledAtMs - previous.sampledAtMs;
  const bytes = next.currentBytes - previous.currentBytes;
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(bytes) || elapsedMs <= 0 || bytes < 0) {
    return { sample };
  }
  return { sample, bytesPerSecond: (bytes * 1000) / elapsedMs };
}
