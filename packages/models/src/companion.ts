/** Basename of a path or file name. */
function fileNameOf(pathOrName: string): string {
  const parts = pathOrName.split(/[/\\]/);
  return parts[parts.length - 1] ?? pathOrName;
}

/**
 * An MTP head GGUF: extra layers that only speed another model up. Loaded on its own, the engine
 * builds the graph with no main weights and crashes.
 */
export function isMtpHeadFile(pathOrName: string): boolean {
  const name = fileNameOf(pathOrName).toLowerCase();
  return name.includes('mtp-only') || name.startsWith('mtp-');
}

/**
 * A draft / DFlash GGUF: a companion that only speeds another model up. Same crash if loaded alone.
 */
export function isDraftModelFile(pathOrName: string): boolean {
  return fileNameOf(pathOrName).toLowerCase().includes('dflash');
}
