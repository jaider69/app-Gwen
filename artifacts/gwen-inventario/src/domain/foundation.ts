/**
 * Stable domain contracts for the phases that will follow.
 *
 * These types intentionally describe boundaries only. They do not activate
 * inventory, authentication, prediction, or voice behavior by themselves.
 */
export type StoreId = string;
export type UserId = string;

export interface StoreScope {
  storeId: StoreId;
  userId: UserId;
}

export interface LocalRecord {
  id: string;
  storeId: StoreId;
  createdAt: string;
  updatedAt: string;
}

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncQueueItem {
  id: string;
  storeId: StoreId;
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  dedupeKey: string;
  createdAt: string;
  attempts: number;
}