import type { AuthSession } from '@/src/services/auth/authService';
import { LOCAL_TABLES } from '@/src/data/database/schema';
import { LocalJsonRepository } from '@/src/data/repositories/localJsonRepository';
import { SyncQueue } from '@/src/data/sync/syncQueue';
import type { SyncQueueItem } from '@/src/domain/foundation';
import type { InventoryMovement, Product, Sale, SaleItem } from '@/src/domain/models';

export type InventoryScope = {
  storeId: string;
  userId: string;
  userName: string;
};

export type InventoryOperation = {
  productId: string;
  quantity: number;
  channel?: 'manual' | 'voz';
  payment?: 'efectivo' | 'otro' | 'transferencia';
};

function createLocalUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const value = Math.floor(Math.random() * 16);
    return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
  });
}

function validateQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('La cantidad debe ser un número entero mayor que cero.');
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

class SupabaseInventoryGateway {
  constructor(private readonly getSession: () => Promise<AuthSession | null>) {}

  private async request(path: string, init: RequestInit = {}): Promise<unknown> {
    const session = await this.getSession();
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!session?.accessToken || !url || !anonKey) {
      throw new Error('Supabase no está configurado para sincronizar movimientos.');
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
      throw new Error(payload?.message ?? payload?.hint ?? 'No fue posible sincronizar el movimiento.');
    }
    return response.status === 204 ? null : response.json().catch(() => null);
  }

  async upsert(table: 'inventory_movements' | 'sales' | 'sale_items', payload: Record<string, unknown>): Promise<void> {
    await this.request(`/rest/v1/${table}?on_conflict=id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });
  }

  
  async registerSale(payload: {
    saleId: string;
    detailId: string;
    movementId: string;
    storeId: string;
    userId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    channel: 'manual' | 'voz';
    payment: 'efectivo' | 'otro' | 'transferencia';
  }): Promise<Record<string, unknown>> {
    const result = await this.request('/rest/v1/rpc/registrar_venta_gwen', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_sale_id: payload.saleId,
        p_detail_id: payload.detailId,
        p_movement_id: payload.movementId,
        p_store_id: payload.storeId,
        p_user_id: payload.userId,
        p_product_id: payload.productId,
        p_quantity: payload.quantity,
        p_unit_price: payload.unitPrice,
        p_channel: payload.channel,
        p_payment: payload.payment,
      }),
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Supabase no confirmó el registro de la venta.');
    }

    return result as Record<string, unknown>;
  }

  async getStock(storeId: string, productId: string): Promise<number> {
    const rows = (await this.request(
      `/rest/v1/inventario?id_tienda=eq.${encodeURIComponent(storeId)}` +
        `&id_producto=eq.${encodeURIComponent(productId)}` +
        '&select=stock_actual',
    )) as Array<{ stock_actual: number | string }>;

    if (rows.length !== 1) {
      throw new Error('No se pudo verificar el stock actualizado en Supabase.');
    }

    const stock = Number(rows[0].stock_actual);

    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('Supabase devolvió un stock inválido.');
    }

    return stock;
  }
  async list(storeId: string): Promise<InventoryMovement[]> {
    const rows = (await this.request(
      `/rest/v1/inventory_movements?store_id=eq.${encodeURIComponent(storeId)}&select=*&order=occurred_at.desc`,
    )) as unknown[];
    return rows.map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: String(row.id),
        storeId: String(row.store_id),
        productId: String(row.product_id),
        userId: String(row.user_id),
        userName: String(row.user_name ?? 'Usuario'),
        quantity: Number(row.quantity ?? 0),
        type: row.type as InventoryMovement['type'],
        occurredAt: String(row.occurred_at),
        stockBefore: Number(row.stock_before ?? 0),
        stockAfter: Number(row.stock_after ?? 0),
        note: row.note ? String(row.note) : undefined,
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
      };
    });
  }
}

function movementPayload(movement: InventoryMovement): Record<string, unknown> {
  return {
    id: movement.id,
    store_id: movement.storeId,
    product_id: movement.productId,
    user_id: movement.userId,
    user_name: movement.userName,
    quantity: movement.quantity,
    type: movement.type,
    occurred_at: movement.occurredAt,
    stock_before: movement.stockBefore,
    stock_after: movement.stockAfter,
    note: movement.note ?? null,
    created_at: movement.createdAt,
    updated_at: movement.updatedAt,
  };
}

export class InventoryService {
  private readonly products = new LocalJsonRepository<Product>(LOCAL_TABLES.products);
  private readonly movements = new LocalJsonRepository<InventoryMovement>(LOCAL_TABLES.inventoryMovements);
  private readonly sales = new LocalJsonRepository<Sale>(LOCAL_TABLES.sales);
  private readonly saleItems = new LocalJsonRepository<SaleItem>(LOCAL_TABLES.saleItems);
  private readonly queue = new SyncQueue();
  private readonly remote: SupabaseInventoryGateway;

  constructor(getSession: () => Promise<AuthSession | null>) {
    this.remote = new SupabaseInventoryGateway(getSession);
  }

  async listMovements(storeId: string): Promise<InventoryMovement[]> {
    const local = await this.movements.list(storeId);
    try {
      const remote = await this.remote.list(storeId);
      const localById = new Map(local.map((movement) => [movement.id, movement]));
      for (const movement of remote) {
        const current = localById.get(movement.id);
        if (!current || movement.updatedAt > current.updatedAt) {
          await this.movements.save(movement);
          localById.set(movement.id, movement);
        }
      }
      return Array.from(localById.values()).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    } catch {
      return local.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    }
  }

  async listSales(storeId: string): Promise<Sale[]> {
    const local = await this.sales.list(storeId);
    return local.sort((a, b) => b.soldAt.localeCompare(a.soldAt));
  }

  async recordEntry(scope: InventoryScope, operation: InventoryOperation): Promise<InventoryMovement> {
    validateQuantity(operation.quantity);
    const product = await this.requireProduct(scope.storeId, operation.productId);
    const now = new Date().toISOString();
    const movement: InventoryMovement = {
      id: createLocalUuid(),
      storeId: scope.storeId,
      productId: product.id,
      userId: scope.userId,
      userName: scope.userName || 'Usuario',
      quantity: operation.quantity,
      type: 'entry',
      occurredAt: now,
      stockBefore: product.stock,
      stockAfter: product.stock + operation.quantity,
      createdAt: now,
      updatedAt: now,
    };
    await this.saveStockAndMovement(
      { ...product, stock: movement.stockAfter, updatedAt: now },
      movement,
    );
    return movement;
  }

  /**
   * Shared sale command used by the manual screen now and by the future voice layer.
   * The voice layer should parse a command into { productId, quantity } and call this method.
   */
  async recordSale(
    scope: InventoryScope,
    operation: InventoryOperation,
  ): Promise<Sale> {
    validateQuantity(operation.quantity);

    const product = await this.requireProduct(
      scope.storeId,
      operation.productId,
    );

    if (operation.quantity > product.stock) {
      throw new Error('No hay suficiente inventario disponible.');
    }

    const now = new Date().toISOString();
    const subtotal = Math.round(
      product.price * operation.quantity * 100,
    ) / 100;

    const saleId = createLocalUuid();
    const detailId = createLocalUuid();
    const movementId = createLocalUuid();

    const sale: Sale = {
      id: saleId,
      storeId: scope.storeId,
      userId: scope.userId,
      userName: scope.userName || 'Usuario',
      soldAt: now,
      total: subtotal,
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };

    const item: SaleItem = {
      id: detailId,
      storeId: scope.storeId,
      saleId,
      productId: product.id,
      productName: product.name,
      quantity: operation.quantity,
      unitPrice: product.price,
      subtotal,
      createdAt: now,
      updatedAt: now,
    };

    const movement: InventoryMovement = {
      id: movementId,
      storeId: scope.storeId,
      productId: product.id,
      userId: scope.userId,
      userName: scope.userName || 'Usuario',
      quantity: operation.quantity,
      type: 'sale',
      occurredAt: now,
      stockBefore: product.stock,
      stockAfter: product.stock - operation.quantity,
      createdAt: now,
      updatedAt: now,
    };

    const updatedProduct: Product = {
      ...product,
      stock: movement.stockAfter,
      updatedAt: now,
    };

    // Guardar la operación localmente para mantener el funcionamiento offline.
    await this.products.save(updatedProduct);
    await this.sales.save(sale);
    await this.saleItems.save(item);
    await this.movements.save(movement);

    // Una sola operación pendiente representa toda la venta.
    // No se encolan ventas, detalles y movimientos por separado.
    await this.enqueue(
      'sale_transaction',
      saleId,
      {
        saleId,
        detailId,
        movementId,
        storeId: scope.storeId,
        userId: scope.userId,
        productId: product.id,
        quantity: operation.quantity,
        unitPrice: product.price,
        channel: operation.channel ?? 'manual',
        payment: operation.payment ?? 'efectivo',
      },
      scope.storeId,
    );

    // Si hay conexión, intenta sincronizar.
    // Si falla por conexión, conserva la operación para reintentar.
    await this.sync(scope.storeId);

    return sale;
  }

  async pendingCount(storeId: string): Promise<number> {
    return (await this.queue.list(storeId)).length;
  }

  async sync(storeId: string): Promise<number> {
    const pendingTransactions = (await this.queue.list(storeId)).filter(
      (item) => item.entity === 'sale_transaction',
    );

    for (const item of pendingTransactions) {
      try {
        const payload = item.payload;

        const saleId = String(payload.saleId ?? '');
        const detailId = String(payload.detailId ?? '');
        const movementId = String(payload.movementId ?? '');
        const payloadStoreId = String(payload.storeId ?? '');
        const userId = String(payload.userId ?? '');
        const productId = String(payload.productId ?? '');
        const quantity = Number(payload.quantity);
        const unitPrice = Number(payload.unitPrice);
        const channel = payload.channel;
        const payment = payload.payment;

        if (
          (channel !== 'manual' && channel !== 'voz') ||
          (payment !== 'efectivo' &&
            payment !== 'otro' &&
            payment !== 'transferencia')
        ) {
          // No eliminar operaciones con datos inválidos.
          break;
        }


        if (
          !saleId ||
          !detailId ||
          !movementId ||
          payloadStoreId !== storeId ||
          !userId ||
          !productId ||
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          !Number.isFinite(unitPrice) ||
          unitPrice < 0 ||
          (channel !== 'manual' && channel !== 'voz') ||
          !['efectivo', 'otro', 'transferencia'].includes(String(payment))
        ) {
          // No eliminar operaciones que no se puedan procesar con seguridad.
          break;
        }

        await this.remote.registerSale({
          saleId,
          detailId,
          movementId,
          storeId,
          userId,
          productId,
          quantity,
          unitPrice,
          channel,
          payment,
        });

        // Consultar el stock real, incluso si el RPC indica que la venta
        // ya se había procesado durante un intento anterior.
        const confirmedStock = await this.remote.getStock(
          storeId,
          productId,
        );

        const localProduct = await this.requireProduct(storeId, productId);

        await this.products.save({
          ...localProduct,
          stock: confirmedStock,
          updatedAt: new Date().toISOString(),
        });

        // Solo retirar la transacción después de confirmar la venta
        // y comprobar el stock remoto.
        await this.queue.remove(item.id);
      
      } catch (error) {
        console.error(
          '[Gwen][Sync] Error al sincronizar la venta:',
          error,
        );
        break;
      }

    }

    return this.pendingCount(storeId);
  }

  private async requireProduct(storeId: string, productId: string): Promise<Product> {
    const product = await this.products.get(storeId, productId);
    if (!product) throw new Error('Selecciona un producto válido.');
    return product;
  }

  private async saveStockAndMovement(product: Product, movement: InventoryMovement): Promise<void> {
    await this.products.save(product);
    await this.movements.save(movement);
    await this.enqueue('product', product.id, productPayload(product), product.storeId);
    await this.enqueue('movement', movement.id, movementPayload(movement), movement.storeId);
  }

  private async enqueue(
    entity: string,
    entityId: string,
    payload: Record<string, unknown>,
    storeId: string,
  ): Promise<SyncQueueItem> {
    return this.queue.enqueue({
      storeId,
      entity,
      entityId,
      operation: 'create',
      payload,
    });
  }
}