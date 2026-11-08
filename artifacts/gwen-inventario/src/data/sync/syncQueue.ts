import { LocalJsonStore } from '@/src/data/local/localJsonStore';
import type { SyncQueueItem } from '@/src/domain/foundation';

const QUEUE_KEY = 'sync-queue';

function createLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class SyncQueue {
  constructor(private readonly store = new LocalJsonStore()) {}

  async list(storeId: string): Promise<SyncQueueItem[]> {
    const allItems = (await this.store.get<SyncQueueItem[]>(QUEUE_KEY)) ?? [];
    return allItems.filter((item) => item.storeId === storeId);
  }

  async enqueue(
    item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'attempts' | 'dedupeKey'> & {
      dedupeKey?: string;
    },
  ): Promise<SyncQueueItem> {
    const allItems = (await this.store.get<SyncQueueItem[]>(QUEUE_KEY)) ?? [];
    const dedupeKey =
      item.dedupeKey ?? `${item.storeId}:${item.entity}:${item.entityId}:${item.operation}`;
    const existingIndex = allItems.findIndex((queued) => queued.dedupeKey === dedupeKey);
    const queuedItem: SyncQueueItem = {
      ...item,
      dedupeKey,
      id: createLocalId(),
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    const nextItems = [...allItems];

    if (existingIndex === -1) {
      nextItems.push(queuedItem);
      await this.store.set(QUEUE_KEY, nextItems);
      return queuedItem;
    }

    const existing = nextItems[existingIndex];
    const deduplicatedItem = {
      ...queuedItem,
      id: existing.id,
      createdAt: existing.createdAt,
      attempts: existing.attempts,
    };
    nextItems[existingIndex] = deduplicatedItem;
    await this.store.set(QUEUE_KEY, nextItems);
    return deduplicatedItem;
  }

  async remove(itemId: string): Promise<void> {
    const allItems = (await this.store.get<SyncQueueItem[]>(QUEUE_KEY)) ?? [];
    await this.store.set(
      QUEUE_KEY,
      allItems.filter((item) => item.id !== itemId),
    );
  }

  async removeTestOperations(
    storeId: string,
    entityIds: string[],
  ): Promise<number> {
    const allItems = (await this.store.get<SyncQueueItem[]>(QUEUE_KEY)) ?? [];

    const nextItems = allItems.filter(
      (item) =>
        !(
          item.storeId === storeId &&
          entityIds.includes(item.entityId) &&
          (item.entity === 'category' || item.entity === 'product') &&
          item.operation === 'create'
        ),
    );

    const removedCount = allItems.length - nextItems.length;

    if (removedCount > 0) {
      await this.store.set(QUEUE_KEY, nextItems);
    }

    return removedCount;
  }
}