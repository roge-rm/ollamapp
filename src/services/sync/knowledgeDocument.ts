export interface KnowledgeDocumentSnapshot {
  syncId: string;
  projectId: string;
  name: string;
  createdAt: string;
  enabled: boolean;
  filePath: string;
  fileSize: number;
}

export type KnowledgeDocumentMutation =
  | { kind: 'indexed'; document: KnowledgeDocumentSnapshot }
  | { kind: 'enabled'; syncId: string; enabled: boolean }
  | { kind: 'deleted'; syncId: string };

/** Knowledge base changes would go to paired devices. This build has no sync, so they go nowhere. */
export function emitKnowledgeDocumentMutation(
  _mutation: KnowledgeDocumentMutation,
): void {}
