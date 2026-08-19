import type { AuthSession } from '@/src/services/auth/authService';
import { LOCAL_TABLES } from '@/src/data/database/schema';
import { LocalJsonRepository } from '@/src/data/repositories/localJsonRepository';
import { SyncQueue } from '@/src/data/sync/syncQueue';
import type { Category, Product } from '@/src/domain/models';
import type { SyncQueueItem } from '@/src/domain/foundation';

export const DEFAULT_CATEGORIES = [
  'Bebidas',
  'Snacks',
  'Lácteos',
  'Granos',
  'Enlatados',
  'Aseo',
  'Dulces',
  'Panadería',
  'Otros',
] as const;

export const EXPIRY_WINDOW_DAYS = 30;

export type ProductDraft = {
  name: string;
  brand: string;
  categoryId: string;
  supplier?: string;
  unit: string;
  stock: number;
  price: number;
  minimumStock: number;
  expiresAt?: string;
};

export type ProductStatus = 'normal' | 'low-stock' | 'out-of-stock' | 'expiring';

export type ProductHealth = {
  status: ProductStatus;
  lowStock: boolean;
  outOfStock: boolean;
  expiring: boolean;
  expired: boolean;
};

function createLocalUuid(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16) || hex();
  });
}

function normalizeDate(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(`${value.trim()}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : value.trim();
}

export function validateProductDraft(draft: ProductDraft): string | null {
  if (!draft.name.trim()) return 'El nombre del producto es obligatorio.';
  if (!draft.categoryId) return 'Selecciona una categoría.';
  if (!Number.isFinite(draft.stock) || draft.stock < 0) return 'La cantidad no puede ser negativa.';
  if (!Number.isFinite(draft.price) || draft.price < 0) return 'El precio no puede ser negativo.';
  if (!Number.isFinite(draft.minimumStock) || draft.minimumStock < 0) {
    return 'El stock mínimo no puede ser negativo.';
  }
  if (draft.expiresAt && !normalizeDate(draft.expiresAt)) {
    return 'La fecha de vencimiento no es válida.';
  }
  return null;
}

export function getProductHealth(product: Product, now = Date.now()): ProductHealth {
  const lowStock = product.stock <= product.minimumStock;
  const outOfStock = product.stock === 0;
  const expiryTime = product.expiresAt
    ? new Date(`${product.expiresAt}T00:00:00`).getTime()
    : Number.NaN;
  const daysUntilExpiry = Number.isNaN(expiryTime)
    ? Number.POSITIVE_INFINITY
    : Math.ceil((expiryTime - now) / (1000 * 60 * 60 * 24));
  const expiring = daysUntilExpiry >= 0 && daysUntilExpiry <= EXPIRY_WINDOW_DAYS;
  const expired = !Number.isNaN(expiryTime) && daysUntilExpiry < 0;

  let status: ProductStatus = 'normal';
  if (outOfStock) status = 'out-of-stock';
  else if (lowStock) status = 'low-stock';
  else if (expiring) status = 'expiring';

  return { status, lowStock, outOfStock, expiring, expired };
}

class SupabaseProductGateway {
  constructor(private readonly getSession: () => Promise<AuthSession | null>) {}

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const session = await this.getSession();
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!session?.accessToken || !url || !anonKey) {
      throw new Error('Supabase no está configurado para sincronizar productos.');
    }
    const response = await fetch(`${url}${path}`, {
      ...init,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
        ...init.headers,
      },
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string; hint?: string } | null;
      throw new Error(payload?.message ?? payload?.hint ?? 'No fue posible sincronizar el inventario.');
    }
    return response.status === 204 ? null : response.json().catch(() => null);
  }

  async upsert(entity: string, payload: Record<string, unknown>): Promise<void> {
    const table = entity === 'category' ? 'categories' : 'products';
    await this.request(`/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
  }

  async remove(entity: string, id: string): Promise<void> {
    const table = entity === 'category' ? 'categories' : 'products';
    await this.request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async list(storeId: string): Promise<{ categories: Category[]; products: Product[] }> {
    const [remoteCategories, remoteProducts] = await Promise.all([
      this.request(`/rest/v1/categories?store_id=eq.${encodeURIComponent(storeId)}&select=*`) as Promise<unknown[]>,
      this.request(`/rest/v1/products?store_id=eq.${encodeURIComponent(storeId)}&select=*`) as Promise<unknown[]>,
    ]);
    return {
      categories: remoteCategories.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id),
          storeId: String(row.store_id),
          name: String(row.name),
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      }),
      products: remoteProducts.map((item) => {
        const row = item as Record<string, unknown>;
        return {
          id: String(row.id),
          storeId: String(row.store_id),
          name: String(row.name),
          brand: String(row.brand ?? ''),
          categoryId: String(row.category_id),
          supplier: row.supplier ? String(row.supplier) : undefined,
          unit: String(row.unit ?? 'unidad'),
          stock: Number(row.stock ?? 0),
          price: Number(row.price ?? 0),
          minimumStock: Number(row.minimum_stock ?? 0),
          expiresAt: row.expires_at ? String(row.expires_at) : undefined,
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        };
      }),
    };
  }
}

function productPayload(product: Product): Record<string, unknown> {
  return {
    id: product.id,
    store_id: product.storeId,
    name: product.name,
    brand: product.brand,
    category_id: product.categoryId,
    supplier: product.supplier ?? null,
    unit: product.unit,
    stock: product.stock,
    price: product.price,
    minimum_stock: product.minimumStock,
    expires_at: product.expiresAt ?? null,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function categoryPayload(category: Category): Record<string, unknown> {
  return {
    id: category.id,
    store_id: category.storeId,
    name: category.name,
    created_at: category.createdAt,
    updated_at: category.updatedAt,
  };
}

function fromQueue(item: SyncQueueItem): { entity: string; payload: Record<string, unknown> } {
  return { entity: item.entity, payload: item.payload };
}

export class ProductService {
  private readonly products = new LocalJsonRepository<Product>(LOCAL_TABLES.products);
  private readonly categories = new LocalJsonRepository<Category>(LOCAL_TABLES.categories);
  private readonly queue = new SyncQueue();
  private readonly remote: SupabaseProductGateway;

  constructor(getSession: () => Promise<AuthSession | null>) {
    this.remote = new SupabaseProductGateway(getSession);
  }

  async list(storeId: string): Promise<{ products: Product[]; categories: Category[] }> {
    let categories = await this.categories.list(storeId);
    if (categories.length === 0) {
      const now = new Date().toISOString();
      categories = DEFAULT_CATEGORIES.map((name) => ({
        id: createLocalUuid(),
        storeId,
        name,
        createdAt: now,
        updatedAt: now,
      }));
      for (const category of categories) {
        await this.categories.save(category);
        await this.queue.enqueue({
          storeId,
          entity: 'category',
          entityId: category.id,
          operation: 'create',
          payload: categoryPayload(category),
        });
      }
    }
    const products = await this.products.list(storeId);
    return { products, categories };
  }

  async get(storeId: string, id: string): Promise<Product | null> {
    return this.products.get(storeId, id);
  }

  async save(storeId: string, draft: ProductDraft, accessToken?: string, id?: string): Promise<Product> {
    if (!storeId) throw new Error('El producto debe pertenecer a una tienda válida.');
    const validationError = validateProductDraft(draft);
    if (validationError) throw new Error(validationError);
    const existing = id ? await this.products.get(storeId, id) : null;
    const now = new Date().toISOString();
    const product: Product = {
      id: existing?.id ?? createLocalUuid(),
      storeId,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      categoryId: draft.categoryId,
      supplier: draft.supplier?.trim() || undefined,
      unit: draft.unit.trim() || 'unidad',
      stock: draft.stock,
      price: draft.price,
      minimumStock: draft.minimumStock,
      expiresAt: normalizeDate(draft.expiresAt),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await this.products.save(product);
    await this.queue.enqueue({
      storeId,
      entity: 'product',
      entityId: product.id,
      operation: existing ? 'update' : 'create',
      payload: productPayload(product),
    });
    if (accessToken) await this.sync(storeId);
    return product;
  }

  async remove(storeId: string, id: string, accessToken?: string): Promise<void> {
    const existing = await this.products.get(storeId, id);
    if (!existing) return;
    await this.products.remove(storeId, id);
    await this.queue.enqueue({
      storeId,
      entity: 'product',
      entityId: id,
      operation: 'delete',
      payload: { id },
    });
    if (accessToken) await this.sync(storeId);
  }

  async createCategory(storeId: string, name: string, accessToken?: string): Promise<Category> {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Escribe el nombre de la categoría.');
    const existing = (await this.categories.list(storeId)).find(
      (category) => category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
    );
    if (existing) return existing;
    const now = new Date().toISOString();
    const category: Category = {
      id: createLocalUuid(),
      storeId,
      name: trimmedName,
      createdAt: now,
      updatedAt: now,
    };
    await this.categories.save(category);
    await this.queue.enqueue({
      storeId,
      entity: 'category',
      entityId: category.id,
      operation: 'create',
      payload: categoryPayload(category),
    });
    if (accessToken) await this.sync(storeId);
    return category;
  }

  async pendingCount(storeId: string): Promise<number> {
    return (await this.queue.list(storeId)).length;
  }

  async sync(storeId: string): Promise<number> {
    const pending = await this.queue.list(storeId);
    for (const item of pending) {
      try {
        if (item.operation === 'delete') {
          await this.remote.remove(item.entity, item.entityId);
        } else {
          const queued = fromQueue(item);
          await this.remote.upsert(queued.entity, queued.payload);
        }
        await this.queue.remove(item.id);
      } catch {
        break;
      }
    }
    if (pending.length === 0 || (await this.queue.list(storeId)).length === 0) {
      try {
        const remote = await this.remote.list(storeId);
        const local = await this.list(storeId);
        const pendingIds = new Set((await this.queue.list(storeId)).map((item) => item.entityId));
        const localCategories = new Map(local.categories.map((category) => [category.id, category]));
        const localProducts = new Map(local.products.map((product) => [product.id, product]));
        for (const category of remote.categories) {
          const localCategory = localCategories.get(category.id);
          if (!pendingIds.has(category.id) && (!localCategory || category.updatedAt > localCategory.updatedAt)) {
            await this.categories.save(category);
          }
        }
        for (const product of remote.products) {
          const localProduct = localProducts.get(product.id);
          if (!pendingIds.has(product.id) && (!localProduct || product.updatedAt > localProduct.updatedAt)) {
            await this.products.save(product);
          }
        }
      } catch {
        // A network failure keeps local data available and the queue pending.
      }
    }
    return this.pendingCount(storeId);
  }
}