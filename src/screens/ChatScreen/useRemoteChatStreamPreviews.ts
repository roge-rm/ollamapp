import type { RemoteStreamItem } from './types';

const NO_PREVIEWS: readonly RemoteStreamItem[] = [];

/** Replies streaming from paired devices. This build has no pairing, so there are never any. */
export function useRemoteChatStreamPreviews(
  _activeConversationId: string | null,
): readonly RemoteStreamItem[] {
  return NO_PREVIEWS;
}
