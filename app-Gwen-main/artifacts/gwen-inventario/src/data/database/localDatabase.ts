import { LocalJsonStore } from '@/src/data/local/localJsonStore';
import { LOCAL_TABLES, type LocalTableName } from '@/src/data/database/schema';

export class LocalDatabase {
  constructor(private readonly storage = new LocalJsonStore()) {}

  async initialize(): Promise<void> {
    // The table registry is the migration boundary for the first SQLite/Supabase phase.
    // Nothing is seeded here: the foundation must not create fake business data.
  }

  async list<TRecord>(table: LocalTableName): Promise<TRecord[]> {
    return (await this.storage.get<TRecord[]>(table)) ?? [];
  }

  async replace<TRecord>(table: LocalTableName, records: TRecord[]): Promise<void> {
    await this.storage.set(table, records);
  }

  async clear(table: LocalTableName): Promise<void> {
    await this.storage.remove(table);
  }

  get tableNames(): readonly LocalTableName[] {
    return Object.values(LOCAL_TABLES);
  }
}