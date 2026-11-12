/** GGUF `general.file_type` values llama.cpp repacks for ARM, so Android copies them into memory. */
const ANDROID_REPACK_FILE_TYPES = new Set([
  2, // Q4_0
  3, // Q4_1
  7, // Q8_0
  14, // Q4_K_S
  15, // Q4_K_M
  25, // IQ4_NL
]);

/**
 * Whether a chat model should memory-map its weights.
 * iOS always maps. Android copies a repackable quant for speed, except on a 4 GB phone
 * (the copy would not fit) and when the GGUF header has no file type.
 */
export function mobileUseMmap(
  platform: 'android' | 'ios',
  fileType: number | null,
  totalRamGb?: number,
): boolean {
  if (platform !== 'android') return true;
  if (totalRamGb != null && totalRamGb <= 4) return true;
  if (fileType == null) return true;
  return !ANDROID_REPACK_FILE_TYPES.has(fileType);
}
