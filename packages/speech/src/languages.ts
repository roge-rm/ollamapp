export interface TranscriptionLanguage {
  code: string;
  label: string;
}

// Languages Whisper's multilingual models handle well. Codes are Whisper's own.
const WHISPER_LANGUAGES: TranscriptionLanguage[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'Arabic' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ca', label: 'Catalan' },
  { code: 'zh', label: 'Chinese' },
  { code: 'cs', label: 'Czech' },
  { code: 'da', label: 'Danish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'fi', label: 'Finnish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'el', label: 'Greek' },
  { code: 'he', label: 'Hebrew' },
  { code: 'hi', label: 'Hindi' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'id', label: 'Indonesian' },
  { code: 'it', label: 'Italian' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ms', label: 'Malay' },
  { code: 'no', label: 'Norwegian' },
  { code: 'fa', label: 'Persian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ro', label: 'Romanian' },
  { code: 'ru', label: 'Russian' },
  { code: 'es', label: 'Spanish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'ta', label: 'Tamil' },
  { code: 'th', label: 'Thai' },
  { code: 'tr', label: 'Turkish' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'ur', label: 'Urdu' },
  { code: 'vi', label: 'Vietnamese' },
];

const ENGLISH_ONLY: TranscriptionLanguage[] = [{ code: 'en', label: 'English' }];

/**
 * Languages a speech-to-text model can be asked for. Whisper models whose id ends in ".en" only
 * know English. Otherwise auto-detect comes after English, so English stays the default.
 */
export function transcriptionLanguages(
  engine: string,
  modelId?: string | null,
): TranscriptionLanguage[] {
  if (engine === 'whisper' && modelId && /\.en$/i.test(modelId)) return ENGLISH_ONLY;
  const [english, ...rest] = WHISPER_LANGUAGES;
  return [english, { code: 'auto', label: 'Auto-detect' }, ...rest];
}
