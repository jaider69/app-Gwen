import type { AuthSession } from '@/src/services/auth/authService';
import { LOCAL_TABLES } from '@/src/data/database/schema';
import { LocalJsonRepository } from '@/src/data/repositories/localJsonRepository';
import { SyncQueue } from '@/src/data/sync/syncQueue';
import type { Category, Product } from '@/src/domain/models';
import { supabase } from '@/src/data/supabase/supabaseClient';

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
  image?: string;
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

  private async request(path: string): Promise<unknown[]> {
    const session = await this.getSession();
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '');
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!session?.accessToken || !url || !anonKey) {
      throw new Error(
        'No hay una sesión autenticada o falta la configuración de Supabase.',
      );
    }

    const response = await fetch(`${url}${path}`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${session.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      let message = body;

      try {
        const payload = JSON.parse(body) as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };

        message = [
          payload.message,
          payload.details,
          payload.hint,
          payload.code ? `Código: ${payload.code}` : undefined,
        ]
          .filter(Boolean)
          .join(' | ');
      } catch {
        // Conserva el texto original si la respuesta no es JSON.
      }

      throw new Error(
        `Error de Supabase (${response.status}): ${
          message || 'No fue posible consultar los datos.'
        }`,
      );
    }

    const data: unknown = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Supabase devolvió una respuesta inesperada.');
    }

    return data;
  }

  async list(
    storeId: string,
  ): Promise<{ categories: Category[]; products: Product[] }> {
    if (!storeId) {
      throw new Error('No se encontró la tienda de la sesión.');
    }

    const encodedStoreId = encodeURIComponent(storeId);

    
    const [categoryRows, productRows, inventoryRows, imageRows] = await Promise.all([
      this.request(
        '/rest/v1/categorias?select=id_categoria,nombre',
      ),
      this.request(
        '/rest/v1/productos?activo=eq.true&select=id_producto,id_categoria,nombre,marca,unidad_medida,precio_referencia,activo',
      ),
      this.request(
        `/rest/v1/inventario?id_tienda=eq.${encodedStoreId}&select=id_tienda,id_producto,stock_actual,stock_minimo,actualizado_en`,
      ),
      this.request(
        `/rest/v1/imagenes_producto_tienda?id_tienda=eq.${encodedStoreId}&select=id_producto,url_publica`,
      ),
    ]);


    type CategoryRow = {
      id_categoria: string;
      nombre: string;
    };

    type ProductRow = {
      id_producto: string;
      id_categoria: string | null;
      nombre: string;
      marca: string | null;
      unidad_medida: string | null;
      precio_referencia: number | string | null;
      activo: boolean;
    };

    type InventoryRow = {
      id_tienda: string;
      id_producto: string;
      stock_actual: number | string | null;
      stock_minimo: number | string | null;
      actualizado_en: string | null;
    };
      
    type ProductImageRow = {
        id_producto: string;
        url_publica: string | null;
    };

    const remoteCategories = categoryRows as CategoryRow[];
    const remoteProducts = productRows as ProductRow[];
    const remoteInventory = inventoryRows as InventoryRow[];

    const remoteImages = imageRows as ProductImageRow[];

    const imageByProduct = new Map(
      remoteImages
        .filter((row) => Boolean(row.url_publica))
        .map((row) => [row.id_producto, row.url_publica as string]),
    );

    const inventoryByProduct = new Map(
      remoteInventory.map((row) => [row.id_producto, row]),
    );

    // Las categorías de Supabase no tienen tienda ni fechas.
    // Estos valores solo completan los metadatos del modelo local.
    const categoryTimestamp = '1970-01-01T00:00:00.000Z';

    const categories: Category[] = remoteCategories.map((row) => ({
      id: row.id_categoria,
      storeId,
      name: row.nombre,
      createdAt: categoryTimestamp,
      updatedAt: categoryTimestamp,
    }));

    const products: Product[] = remoteProducts.flatMap((row) => {
      const inventory = inventoryByProduct.get(row.id_producto);

      // Un producto sin fila de inventario para esta tienda
      // no debe mostrarse como si tuviera stock conocido.
      if (!inventory || inventory.id_tienda !== storeId) {
        return [];
      }

      const updatedAt =
        inventory.actualizado_en ?? categoryTimestamp;

      return [
        {
          id: row.id_producto,
          storeId,
          name: row.nombre,
          brand: row.marca ?? '',
          image: imageByProduct.get(row.id_producto),
          categoryId: row.id_categoria ?? '',
          unit: row.unidad_medida || 'unidad',
          stock: Number(inventory.stock_actual ?? 0),
          price: Number(row.precio_referencia ?? 0),
          minimumStock: Number(inventory.stock_minimo ?? 0),
          createdAt: updatedAt,
          updatedAt,
        },
      ];
    });

    return { categories, products };
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

export class ProductService {
  private readonly products = new LocalJsonRepository<Product>(LOCAL_TABLES.products);
  private readonly categories = new LocalJsonRepository<Category>(LOCAL_TABLES.categories);
  private readonly queue = new SyncQueue();
  private readonly remote: SupabaseProductGateway;

  constructor(getSession: () => Promise<AuthSession | null>) {
    this.remote = new SupabaseProductGateway(getSession);
  }

  
  async list(
    storeId: string,
  ): Promise<{ products: Product[]; categories: Category[] }> {
    if (!storeId) {
      throw new Error('No se encontró una tienda para cargar el inventario.');
    }

    // La lectura remota es obligatoria: no ocultamos sus errores.
    const remote = await this.remote.list(storeId);

    const [localCategories, localProducts, pending] = await Promise.all([
      this.categories.list(storeId),
      this.products.list(storeId),
      this.queue.list(storeId),
    ]);

    const pendingItems = pending.filter(
      (item) => item.entity === 'product' || item.entity === 'category',
    );

    const pendingSaleTransactions = pending.filter(
      (item) => item.entity === 'sale_transaction',
    );

    const pendingSaleProductIds = new Set(
      pendingSaleTransactions
        .map((item) => String(item.payload.productId ?? ''))
        .filter(Boolean),
    );

    const pendingIds = new Set(pendingItems.map((item) => item.entityId));

    const deletedProductIds = new Set(
      pendingItems
        .filter((item) => item.entity === 'product' && item.operation === 'delete')
        .map((item) => item.entityId),
    );

    const deletedCategoryIds = new Set(
      pendingItems
        .filter((item) => item.entity === 'category' && item.operation === 'delete')
        .map((item) => item.entityId),
    );

    const localProductById = new Map(
      localProducts.map((product) => [product.id, product]),
    );

    const localCategoryById = new Map(
      localCategories.map((category) => [category.id, category]),
    );

    // Actualiza la caché local con los datos remotos,
    // excepto los registros que tengan cambios pendientes.
    for (const category of remote.categories) {
      if (!pendingIds.has(category.id)) {
        await this.categories.save(category);
      }
    }

    for (const product of remote.products) {
      if (
        !pendingIds.has(product.id) &&
        !pendingSaleProductIds.has(product.id)
      ) {
        await this.products.save(product);
      }
    }

    const categoriesById = new Map(
      remote.categories.map((category) => [category.id, category]),
    );

    const productsById = new Map(
      remote.products.map((product) => [product.id, product]),
    );

    for (const productId of pendingSaleProductIds) {
      const local = localProductById.get(productId);

      if (local) {
        productsById.set(local.id, local);
      }
    }

    // Conserva categorías y productos locales solo si tienen
    // operaciones pendientes de sincronización.
    for (const item of pendingItems) {
      if (item.operation === 'delete') continue;

      if (item.entity === 'category') {
        const local = localCategoryById.get(item.entityId);
        if (local) categoriesById.set(local.id, local);
      }

      if (item.entity === 'product') {
        const local = localProductById.get(item.entityId);
        if (local) productsById.set(local.id, local);
      }
    }

    return {
      categories: [...categoriesById.values()].filter(
        (category) => !deletedCategoryIds.has(category.id),
      ),
      products: [...productsById.values()].filter(
        (product) => !deletedProductIds.has(product.id),
      ),
    };
  }


  async get(storeId: string, id: string): Promise<Product | null> {
    return this.products.get(storeId, id);
  }


  async save(
    storeId: string,
    draft: ProductDraft,
    accessToken?: string,
    id?: string,
  ): Promise<Product> {
    if (!storeId) {
      throw new Error('El producto debe pertenecer a una tienda válida.');
    }

    if (!accessToken) {
      throw new Error('Debes iniciar sesión para guardar el producto.');
    }

    const validationError = validateProductDraft(draft);
    if (validationError) throw new Error(validationError);

    const localReadStartedAt = Date.now();
    const existing = id ? await this.products.get(storeId, id) : null;

    console.log(
      `[Gwen][Tiempo] Lectura local del producto: ${Date.now() - localReadStartedAt} ms`,
    );
    const now = new Date().toISOString();

    const payload = {
      p_store_id: storeId,
      p_category_id: draft.categoryId,
      p_name: draft.name.trim(),
      p_brand: draft.brand.trim(),
      p_unit: draft.unit.trim() || 'unidad',
      p_price: draft.price,
      p_stock: draft.stock,
      p_minimum_stock: draft.minimumStock,
    };

    let remoteId: string;
    const remoteSaveStartedAt = Date.now();

    try {
      if (id) {
        const { data, error } = await supabase.rpc('editar_producto_gwen', {
          ...payload,
          p_product_id: id,
        });

        if (error) {
          throw new Error(`No se pudo editar el producto: ${error.message}`);
        }

        const result = data as { id_producto?: string } | null;
        remoteId = result?.id_producto ?? id;
      } else {
        const { data, error } = await supabase.rpc('crear_producto_gwen', payload);

        if (error) {
          throw new Error(`No se pudo crear el producto: ${error.message}`);
        }

        const result = data as { id_producto?: string } | null;
        if (!result?.id_producto) {
          throw new Error('Supabase no devolvió el identificador del producto creado.');
        }

        remoteId = result.id_producto;
      }
    } finally {
      console.log(
        `[Gwen][Tiempo] Guardado Supabase (${id ? 'edición' : 'creación'}): ${Date.now() - remoteSaveStartedAt} ms`,
      );
    }

    const product: Product = {
      id: remoteId,
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
      image: draft.image ?? existing?.image,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const localSaveStartedAt = Date.now();
    await this.products.save(product);

    console.log(
      `[Gwen][Tiempo] Escritura local del producto: ${Date.now() - localSaveStartedAt} ms`,
    );
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
    if (!storeId) {
      throw new Error('No se encontró una tienda para sincronizar.');
    }

    const testOperationIds = [
      '5888031c-4b2b-4b11-b983-95b17e6b5710',
      'b98eed60-ac59-4b85-aef9-2097629e5fa5',
      'd16471ec-7e32-4844-96e1-8a920e2de811',
      '088dff40-999e-44e2-a92e-2ec3168e860c',
      'd4777513-8933-4c27-86c5-ba9030f1d155',
      'f49329fc-9f20-40b9-b610-817e38c30179',
      '0665f918-b5e2-4aa1-ad88-88730f8cf74b',
      '48c65f12-c56d-4b67-9b71-933499df74fb',
      '4c9f864f-240e-4184-8e05-f58e2c60e23d',
      '3b635923-5557-4381-bbc6-af3a39563c0b',
    ];

    const removedCount = await this.queue.removeTestOperations(
      storeId,
      testOperationIds,
    );

    if (removedCount > 0) {
      console.log(
        `[Gwen][Sync] Operaciones de prueba eliminadas: ${removedCount}`,
      );
    }

    return this.pendingCount(storeId);
  }

}