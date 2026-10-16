import { SyncQueue } from '@/src/data/sync/syncQueue';
import type { StoreId } from '@/src/domain/foundation';
import { SupabaseGateway } from '@/src/services/supabase/supabaseGateway';

export interface ConnectivityAdapter {
  isOnline(): Promise<boolean>;
}

export type SyncStatus = 'offline' | 'pending' | 'not-configured';

export interface SyncInspection {
  status: SyncStatus;
  pendingCount: number;
}

export class SyncService {
  constructor(
    private readonly queue = new SyncQueue(),
    private readonly remote = new SupabaseGateway(),
    private readonly connectivity?: ConnectivityAdapter,
  ) {}

  async inspect(storeId: StoreId): Promise<SyncInspection> {
    const pendingCount = (await this.queue.list(storeId)).length;
    if (this.connectivity && !(await this.connectivity.isOnline())) {
      return { status: 'offline', pendingCount };
    }
    return {
      status: this.remote.isConfigured() ? 'pending' : 'not-configured',
      pendingCount,
    };
  }

  async sync(storeId: StoreId): Promise<SyncInspection> {
    // Real upload/download, retry policy, and conflict resolution belong to Phase 4.
    return this.inspect(storeId);
  }
}