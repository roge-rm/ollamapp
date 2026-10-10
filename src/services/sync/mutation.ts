import type { Conversation, Message, Project } from '../../types';

/**
 * Record names for changes the app reports as it edits chats, projects and settings.
 * This build has no sync, so the builders make nothing and emitSyncMutation drops it.
 */
export const CORE_SYNC_ENTITIES = {
  project: 'project',
  conversation: 'conversation',
  message: 'message',
  knowledgeDocument: 'knowledge_document',
  sharedFile: 'shared_file',
  modelSetting: 'model_setting',
  taskLaunch: 'task_launch',
  taskRun: 'task_run',
  taskControl: 'task_control',
} as const;

export type CoreSyncEntity =
  (typeof CORE_SYNC_ENTITIES)[keyof typeof CORE_SYNC_ENTITIES];

export interface SyncMutation {
  entity: CoreSyncEntity;
  entityId: string;
  kind: 'put' | 'delete';
  fields?: Record<string, unknown>;
}

export function modelSettingMutations(
  _before: Record<string, unknown>,
  _after: Record<string, unknown>,
): SyncMutation[] {
  return [];
}

export function mobileModelSettingPatch(
  _wireKey: string,
  _fields: Record<string, unknown>,
): Record<string, unknown> | null {
  return null;
}

export function conversationPutMutation(_conversation: Conversation): SyncMutation | null {
  return null;
}

export function messagePutMutation(
  _conversationId: string,
  _message: Message,
): SyncMutation | null {
  return null;
}

export function projectPutMutation(_project: Project): SyncMutation | null {
  return null;
}

export function deleteSyncMutation(
  _entity: CoreSyncEntity,
  _entityId: string,
): SyncMutation | null {
  return null;
}

export function emitSyncMutation(_mutation: SyncMutation | null): void {}

export function emitChangedModelSettings(
  _before: object,
  _after: object,
): void {}
