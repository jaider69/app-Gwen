import type { StoreId } from '@/src/domain/foundation';

export interface RepositoryRecord {
  id: string;
  storeId: StoreId;
  createdAt: string;
  updatedAt: string;
}

export interface LocalRepository<TRecord extends RepositoryRecord> {
  list(storeId: StoreId): Promise<TRecord[]>;
  get(storeId: StoreId, recordId: string): Promise<TRecord | null>;
  save(record: TRecord): Promise<void>;
  remove(storeId: StoreId, recordId: string): Promise<void>;
}

export interface RemoteGateway {
  isConfigured(): boolean;
}

export interface PredictionGateway {
  isConfigured(): boolean;
}