// Shapes stored on chat records. Device sync is gone in this build, but saved chats and the
// tool timeline still use these fields.

export type DevicePlatform = 'ios' | 'android' | 'macos' | 'windows' | 'linux';

/** Where a record was written. Old chats can carry it; new ones from this build don't. */
export interface RecordProvenance {
  originDeviceId: string;
  originDeviceName?: string;
  originPlatform?: DevicePlatform;
  updatedAt?: number;
}

export type SyncedTurnStatus = 'running' | 'completed' | 'failed' | 'cancelled';

/** One tool call shown on an assistant turn. */
export interface SyncedToolArtifact {
  id?: string;
  name: string;
  arguments?: string;
  result: string;
  status?: 'running' | 'completed' | 'failed';
  durationMs?: number;
}

/** Order of thinking and tool calls in a turn. `toolIndex` points into `toolArtifacts`. */
export type SyncedAssistantTimelineEntry =
  | { kind: 'thinking'; text: string }
  | { kind: 'tool'; toolIndex: number };

export interface TransferredModelFile {
  name: string;
  sizeBytes: number;
  role: 'primary' | 'projector';
}

/** A model package received from another device. */
export interface TransferredModelManifest {
  id: string;
  name: string;
  kind: 'text' | 'vision' | 'image';
  source: 'downloaded' | 'local';
  engine?: string;
  platform?: DevicePlatform;
  /** The Hugging Face source the sender recorded, if any. */
  origin?: { repoId: string; revision: string; path: string };
  files: TransferredModelFile[];
}

function isSafeFileName(name: string): boolean {
  return (
    name.length > 0 &&
    name !== '.' &&
    name !== '..' &&
    !name.includes('/') &&
    !name.includes('\\')
  );
}

/** Why a received text or vision model package can't be installed, or null when it can. */
export function ogamModelTransferBlocker(
  manifest: TransferredModelManifest,
): string | null {
  if (!manifest.id || !manifest.files?.length) return 'the model package is empty';
  for (const file of manifest.files) {
    if (!isSafeFileName(file.name)) return 'a file name is not safe';
    if (!/\.gguf$/i.test(file.name)) return 'only GGUF files can be received';
    if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes <= 0) {
      return 'a file size is not valid';
    }
  }
  if (manifest.files.filter(file => file.role === 'primary').length > 1) {
    return 'the package has more than one primary file';
  }
  return null;
}
