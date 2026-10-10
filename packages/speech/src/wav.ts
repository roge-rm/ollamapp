/**
 * Where to cut silence off the ends of a PCM WAV file. Pure: the caller reads and writes.
 *
 * The result always uses a plain 44-byte header, followed by `copyBytes` of audio copied from
 * `copyFrom` in the original file.
 */

/** Size of the header written in front of the trimmed audio. */
export const WAV_HEADER_BYTES = 44;

/** How much of the file's start to read to find the fmt and data chunks. */
export const WAV_HEADER_SCAN_BYTES = 4096;

export interface WavTrimPlan {
  header: Uint8Array;
  copyFrom: number;
  copyBytes: number;
  droppedSeconds: number;
}

interface WavFormat {
  audioFormat: number;
  channels: number;
  sampleRate: number;
  bitsPerSample: number;
  blockAlign: number;
  byteRate: number;
}

const ascii = (bytes: Uint8Array, at: number): string =>
  String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);

/**
 * Plans the trim, or returns null when the header can't be read, nothing would be dropped or
 * no audio would be left.
 */
export function planWavTrim(
  head: Uint8Array,
  dropFrontSeconds: number,
  fileBytes: number,
  dropTailSeconds: number = 0,
): WavTrimPlan | null {
  if (head.length < 12 || ascii(head, 0) !== 'RIFF' || ascii(head, 8) !== 'WAVE') return null;
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);

  let format: WavFormat | null = null;
  let dataStart = -1;
  let dataSize = 0;
  let at = 12;
  while (at + 8 <= head.length) {
    const id = ascii(head, at);
    const size = view.getUint32(at + 4, true);
    const body = at + 8;
    if (id === 'fmt ' && body + 16 <= head.length) {
      format = {
        audioFormat: view.getUint16(body, true),
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        byteRate: view.getUint32(body + 8, true),
        blockAlign: view.getUint16(body + 12, true),
        bitsPerSample: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      dataStart = body;
      dataSize = size;
      break;
    }
    // Chunks are padded to an even length.
    at = body + size + (size % 2);
  }
  if (!format || dataStart < 0 || format.blockAlign <= 0 || format.byteRate <= 0) return null;

  // A recorder still writing, or one that never patched the size, leaves 0 or 0xFFFFFFFF here.
  const available = Math.max(0, fileBytes - dataStart);
  const audioBytes =
    dataSize > 0 && dataSize !== 0xffffffff ? Math.min(dataSize, available) : available;
  const totalFrames = Math.floor(audioBytes / format.blockAlign);

  const toFrames = (seconds: number): number =>
    Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds * format!.sampleRate) : 0;
  const frontFrames = Math.min(toFrames(dropFrontSeconds), totalFrames);
  const tailFrames = Math.min(toFrames(dropTailSeconds), totalFrames - frontFrames);
  const keptFrames = totalFrames - frontFrames - tailFrames;
  if (frontFrames + tailFrames === 0 || keptFrames <= 0) return null;

  const copyBytes = keptFrames * format.blockAlign;
  return {
    header: canonicalHeader(format, copyBytes),
    copyFrom: dataStart + frontFrames * format.blockAlign,
    copyBytes,
    droppedSeconds: (frontFrames + tailFrames) / format.sampleRate,
  };
}

function canonicalHeader(format: WavFormat, dataBytes: number): Uint8Array {
  const header = new Uint8Array(WAV_HEADER_BYTES);
  const view = new DataView(header.buffer);
  const write = (at: number, text: string): void => {
    for (let i = 0; i < 4; i++) header[at + i] = text.charCodeAt(i);
  };
  write(0, 'RIFF');
  view.setUint32(4, WAV_HEADER_BYTES - 8 + dataBytes, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  // An extensible header's sub-format is PCM or float; a 16-byte fmt chunk can't say "extensible".
  const audioFormat = format.audioFormat === 0xfffe ? (format.bitsPerSample === 32 ? 3 : 1) : format.audioFormat;
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, format.channels, true);
  view.setUint32(24, format.sampleRate, true);
  view.setUint32(28, format.byteRate, true);
  view.setUint16(32, format.blockAlign, true);
  view.setUint16(34, format.bitsPerSample, true);
  write(36, 'data');
  view.setUint32(40, dataBytes, true);
  return header;
}
