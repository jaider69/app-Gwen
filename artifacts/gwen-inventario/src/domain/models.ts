import type { LocalRecord, StoreId, UserId } from '@/src/domain/foundation';

export interface Store extends LocalRecord {
  name: string;
  address?: string;
}

export interface User extends LocalRecord {
  userId: UserId;
  storeId: StoreId;
  displayName: string;
  email?: string;
}

export interface Category extends LocalRecord {
  name: string;
}

export interface Product extends LocalRecord {
  name: string;
  brand: string;
  categoryId: string;
  supplier?: string;
  unit: string;
  stock: number;
  price: number;
  minimumStock: number;
  expiresAt?: string;
}

export interface InventoryMovement extends LocalRecord {
  productId: string;
  userId: string;
  userName: string;
  quantity: number;
  type: 'entry' | 'sale' | 'adjustment';
  occurredAt: string;
  stockBefore: number;
  stockAfter: number;
  note?: string;
}

export interface Sale extends LocalRecord {
  userId: string;
  userName: string;
  soldAt: string;
  total: number;
  status: 'draft' | 'completed' | 'cancelled';
}

export interface SaleItem extends LocalRecord {
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}