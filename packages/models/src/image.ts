// Per-model image generation parameters: the user's override wins, otherwise the model default.

export interface ImageParameterOverride {
  steps?: number | null;
  cfgScale?: number | null;
  size?: number | null;
}

/** Overrides keyed by model id. */
export type ImageParameterStore = Record<string, ImageParameterOverride | undefined>;

export interface EffectiveImageParameters {
  steps: number;
  cfgScale: number;
  size: number;
}

const DEFAULTS: EffectiveImageParameters = { steps: 20, cfgScale: 7.5, size: 512 };
// Distilled models (turbo, lightning, LCM) are tuned for few steps and low guidance.
const FAST_DEFAULTS: EffectiveImageParameters = { steps: 6, cfgScale: 2, size: 512 };

function modelDefaults(model: { id: string; name?: string }): EffectiveImageParameters {
  const key = `${model.id} ${model.name ?? ''}`.toLowerCase();
  return /turbo|lightning|lcm|hyper|schnell/.test(key) ? FAST_DEFAULTS : DEFAULTS;
}

/** override ?? fallback, where a missing, NaN or non-positive override counts as no override. */
export function effectiveImageParameter(override: number | null | undefined, fallback: number): number {
  return typeof override === 'number' && Number.isFinite(override) && override > 0 ? override : fallback;
}

export function resolveImageParameters(
  model: { id: string; name?: string },
  store: ImageParameterStore | null | undefined,
): EffectiveImageParameters {
  const defaults = modelDefaults(model);
  const override = store?.[model.id] ?? {};
  return {
    steps: effectiveImageParameter(override.steps, defaults.steps),
    cfgScale: effectiveImageParameter(override.cfgScale, defaults.cfgScale),
    size: effectiveImageParameter(override.size, defaults.size),
  };
}
