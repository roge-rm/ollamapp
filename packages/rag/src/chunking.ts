// Paragraph-aware chunking. Paragraphs are packed up to chunkSize; a paragraph longer than that
// is cut with a sliding window so text near a cut shows up in both chunks.

export interface ChunkOptions {
  chunkSize?: number;
  overlap?: number;
  minChunkLength?: number;
}

export interface Chunk {
  content: string;
  position: number;
}

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_OVERLAP = 100;
const DEFAULT_MIN_CHUNK_LENGTH = 20;

function pushChunk(chunks: string[], text: string, minLength: number): void {
  const trimmed = text.trim();
  if (trimmed.length >= minLength) chunks.push(trimmed);
}

export function chunkText(text: string, options?: ChunkOptions): Chunk[] {
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = options?.overlap ?? DEFAULT_OVERLAP;
  const minLength = options?.minChunkLength ?? DEFAULT_MIN_CHUNK_LENGTH;

  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const chunks: string[] = [];
  let current = '';

  for (const paragraph of clean.split(/\n\n+/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (trimmed.length > chunkSize) {
      pushChunk(chunks, current, minLength);
      current = '';
      const step = Math.max(1, chunkSize - overlap);
      for (let start = 0; start < trimmed.length; start += step) {
        pushChunk(chunks, trimmed.slice(start, start + chunkSize), minLength);
        if (start + chunkSize >= trimmed.length) break;
      }
      continue;
    }

    const candidate = current ? `${current}\n\n${trimmed}` : trimmed;
    if (candidate.length > chunkSize) {
      pushChunk(chunks, current, minLength);
      current = trimmed;
    } else {
      current = candidate;
    }
  }
  pushChunk(chunks, current, minLength);

  // A whole document shorter than the minimum is kept as one chunk, or it could never be found.
  if (chunks.length === 0) return [{ content: clean, position: 0 }];
  return chunks.map((content, position) => ({ content, position }));
}
