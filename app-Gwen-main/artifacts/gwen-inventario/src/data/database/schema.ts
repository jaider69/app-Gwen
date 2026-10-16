/**
 * The local table registry is intentionally declarative in Phase 1.
 * No rows are created until the corresponding feature phase is implemented.
 */
export const LOCAL_TABLES = {
  stores: 'stores',
  users: 'users',
  categories: 'categories',
  products: 'products',
  inventoryMovements: 'inventory_movements',
  sales: 'sales',
  saleItems: 'sale_items',
  syncQueue: 'sync_queue',
} as const;

export type LocalTableName = (typeof LOCAL_TABLES)[keyof typeof LOCAL_TABLES];