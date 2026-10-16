import type { StoreId } from '@/src/domain/foundation';
import type { LocalRepository, RepositoryRecord } from '@/src/domain/repositories/contracts';
import { LocalDatabase } from '@/src/data/database/localDatabase';

export class LocalJsonRepository<TRecord extends RepositoryRecord>
  implements LocalRepository<TRecord>
{
  constructor(
    private readonly table: Parameters<LocalDatabase['list']>[0],
    private readonly database = new LocalDatabase(),
  ) {}

  async list(storeId: StoreId): Promise<TRecord[]> {
    const records = await this.database.list<TRecord>(this.table);
    return records.filter((record) => record.storeId === storeId);
  }

  async get(storeId: StoreId, recordId: string): Promise<TRecord | null> {
    const records = await this.list(storeId);
    return records.find((record) => record.id === recordId) ?? null;
  }

  async save(record: TRecord): Promise<void> {
    const records = await this.database.list<TRecord>(this.table);
    const existingIndex = records.findIndex((item) => item.id === record.id);
    const nextRecords = [...records];
    if (existingIndex === -1) {
      nextRecords.push(record);
    } else {
      nextRecords[existingIndex] = record;
    }
    await this.database.replace(this.table, nextRecords);
  }

  async remove(storeId: StoreId, recordId: string): Promise<void> {
    const records = await this.database.list<TRecord>(this.table);
    await this.database.replace(
      this.table,
      records.filter((record) => !(record.storeId === storeId && record.id === recordId)),
    );
  }
}