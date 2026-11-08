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

export type MultipleSaleItem = {
  productId: string;
  quantity: number;
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

  async registerMultipleSale(payload: {
  saleId: string;
  storeId: string;
  userId: string;
  items: Array<{
    detailId: string;
    movementId: string;
    productId: string;
    quantity: number;
  }>;
  channel: 'manual' | 'voz';
  payment: 'efectivo' | 'otro' | 'transferencia';
}): Promise<Record<string, unknown>> {
  const result = await this.request(
    '/rest/v1/rpc/registrar_venta_multiple_gwen',
    {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        p_sale_id: payload.saleId,
        p_store_id: payload.storeId,
        p_user_id: payload.userId,
        p_items: payload.items.map((item) => ({
          detail_id: item.detailId,
          movement_id: item.movementId,
          product_id: item.productId,
          quantity: item.quantity,
        })),
        p_channel: payload.channel,
        p_payment: payload.payment,
      }),
    },
  );

  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('Supabase devolvió una respuesta inválida al registrar la venta.');
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

    async registerEntry(payload: {
    movementId: string;
    storeId: string;
    productId: string;
    userId: string;
    quantity: number;
    note?: string;
  }): Promise<Record<string, unknown>> {
    const result = await this.request('/rest/v1/rpc/registrar_entrada_gwen', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        p_movement_id: payload.movementId,
        p_store_id: payload.storeId,
        p_product_id: payload.productId,
        p_user_id: payload.userId,
        p_quantity: payload.quantity,
        p_observacion: payload.note ?? 'Entrada registrada desde Gwen',
      }),
    });

    if (!result || typeof result !== 'object') {
      throw new Error('Supabase no confirmó el registro de la entrada.');
    }

    return result as Record<string, unknown>;
  }

  
  async getProduct(storeId: string, productId: string): Promise<Product> {
    const encodedStoreId = encodeURIComponent(storeId);
    const encodedProductId = encodeURIComponent(productId);

    const [productRows, inventoryRows] = await Promise.all([
      this.request(
        `/rest/v1/productos?id_producto=eq.${encodedProductId}` +
          '&activo=eq.true' +
          '&select=id_producto,id_categoria,nombre,unidad_medida,precio_referencia',
      ),
      this.request(
        `/rest/v1/inventario?id_tienda=eq.${encodedStoreId}` +
          `&id_producto=eq.${encodedProductId}` +
          '&select=id_tienda,id_producto,stock_actual,stock_minimo,actualizado_en',
      ),
    ]);

    const products = productRows as Array<Record<string, unknown>>;
    const inventory = inventoryRows as Array<Record<string, unknown>>;

    if (products.length !== 1 || inventory.length !== 1) {
      throw new Error(
        'No se encontró el producto o su inventario en la tienda de Supabase.',
      );
    }

    const product = products[0];
    const stockRow = inventory[0];

    const stock = Number(stockRow.stock_actual);
    const price = Number(product.precio_referencia);
    const minimumStock = Number(stockRow.stock_minimo ?? 0);
    const updatedAt = String(
      stockRow.actualizado_en ?? new Date().toISOString(),
    );

    if (
      String(stockRow.id_tienda) !== storeId ||
      !Number.isInteger(stock) ||
      stock < 0 ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error('El producto tiene datos de inventario o precio inválidos.');
    }

    return {
      id: String(product.id_producto),
      storeId,
      name: String(product.nombre),
      brand: '',
      categoryId: String(product.id_categoria ?? ''),
      unit: String(product.unidad_medida ?? 'unidad'),
      stock,
      price,
      minimumStock,
      createdAt: updatedAt,
      updatedAt,
    };
  }

  
  async list(storeId: string): Promise<InventoryMovement[]> {
    const rows = (await this.request(
      `/rest/v1/movimientos_inventario?id_tienda=eq.${encodeURIComponent(storeId)}` +
        '&select=id_movimiento,id_tienda,id_producto,fecha_hora,tipo,cantidad,id_venta,observacion,stock_anterior,stock_posterior' +
        '&order=fecha_hora.desc',
    )) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id_movimiento),
      storeId: String(row.id_tienda),
      productId: String(row.id_producto),
      userId: '',
      userName: 'Usuario',
      quantity: Number(row.cantidad ?? 0),
      type:
        row.tipo === 'entrada'
          ? 'entry'
          : row.tipo === 'salida'
            ? 'sale'
            : 'adjustment',
      occurredAt: String(row.fecha_hora),
      stockBefore:
        row.stock_anterior == null ? null : Number(row.stock_anterior),
      stockAfter:
        row.stock_posterior == null ? null : Number(row.stock_posterior),
      note: row.observacion ? String(row.observacion) : undefined,
      createdAt: String(row.fecha_hora),
      updatedAt: String(row.fecha_hora),
    }));
  }
  
  async listSales(storeId: string): Promise<Sale[]> {
    const rows = (await this.request(
      `/rest/v1/ventas?id_tienda=eq.${encodeURIComponent(storeId)}` +
        '&select=id_venta,id_tienda,id_usuario,fecha_hora,total' +
        '&order=fecha_hora.desc',
    )) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id_venta),
      storeId: String(row.id_tienda),
      userId: String(row.id_usuario),
      userName: 'Usuario',
      soldAt: String(row.fecha_hora),
      total: Number(row.total ?? 0),
      status: 'completed',
      createdAt: String(row.fecha_hora),
      updatedAt: String(row.fecha_hora),
    }));
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
    return this.remote.list(storeId);
  }


  
  async listSales(storeId: string): Promise<Sale[]> {
    return this.remote.listSales(storeId);
  }


    async recordEntry(
    scope: InventoryScope,
    operation: InventoryOperation,
  ): Promise<InventoryMovement> {
    validateQuantity(operation.quantity);

    const product = await this.remote.getProduct(
      scope.storeId,
      operation.productId,
    );

    const movementId = createLocalUuid();

    const result = await this.remote.registerEntry({
      movementId,
      storeId: scope.storeId,
      productId: product.id,
      userId: scope.userId,
      quantity: operation.quantity,
      note: 'Entrada registrada desde Gwen',
    });

    if (result.success !== true) {
      throw new Error('Supabase no confirmó el registro de la entrada.');
    }

    const now = new Date().toISOString();
    const stockBefore = Number(result.stock_before);
    const stockAfter = Number(result.stock_after);

    if (
      !Number.isInteger(stockBefore) ||
      !Number.isInteger(stockAfter) ||
      stockBefore < 0 ||
      stockAfter !== stockBefore + operation.quantity
    ) {
      throw new Error(
        'La entrada se registró, pero Supabase no devolvió un stock válido.',
      );
    }

    return {
      id: movementId,
      storeId: scope.storeId,
      productId: product.id,
      userId: scope.userId,
      userName: scope.userName || 'Usuario',
      quantity: operation.quantity,
      type: 'entry',
      occurredAt: now,
      stockBefore,
      stockAfter,
      note: 'Entrada registrada desde Gwen',
      createdAt: now,
      updatedAt: now,
    };
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

    const product = await this.remote.getProduct(
      scope.storeId,
      operation.productId,
    );

    if (operation.quantity > product.stock) {
      throw new Error('No hay suficiente inventario disponible.');
    }

    const saleId = createLocalUuid();
    const detailId = createLocalUuid();
    const movementId = createLocalUuid();

    const channel = operation.channel ?? 'manual';
    const payment = operation.payment ?? 'efectivo';

    const result = await this.remote.registerSale({
      saleId,
      detailId,
      movementId,
      storeId: scope.storeId,
      userId: scope.userId,
      productId: product.id,
      quantity: operation.quantity,
      unitPrice: product.price,
      channel,
      payment,
    });

    if (result.success !== true) {
      throw new Error('Supabase no confirmó el registro de la venta.');
    }

    const now = new Date().toISOString();

    return {
      id: saleId,
      storeId: scope.storeId,
      userId: scope.userId,
      userName: scope.userName || 'Usuario',
      soldAt: now,
      total: Number(result.total ?? product.price * operation.quantity),
      status: 'completed',
      createdAt: now,
      updatedAt: now,
    };
  }

  async recordMultipleSale(
    scope: InventoryScope,
    items: MultipleSaleItem[],
  ): Promise<Sale> {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Agrega al menos un producto para registrar la venta.');
    }

    const seenProducts = new Set<string>();

    const validatedItems = items.map((item) => {
      const productId = item.productId?.trim();

      if (!productId) {
        throw new Error('Hay un producto inválido en el carrito.');
      }

      if (seenProducts.has(productId)) {
        throw new Error('No puedes agregar el mismo producto dos veces.');
      }

      seenProducts.add(productId);

      const quantity = validateQuantity(item.quantity);

      return {
        productId,
        quantity: item.quantity,
        detailId: createLocalUuid(),
        movementId: createLocalUuid(),
      };
    });

    const saleId = createLocalUuid();

    const result = await this.remote.registerMultipleSale({
      saleId,
      storeId: scope.storeId,
      userId: scope.userId,
      items: validatedItems,
      channel: 'manual',
      payment: 'efectivo',
    });

    if (result.success !== true) {
      throw new Error('No fue posible registrar la venta múltiple.');
    }

    return {
      id: saleId,
      storeId: scope.storeId,
      userId: scope.userId,
      total: Number(result.total ?? 0),
      status: 'completed',
      createdAt: new Date().toISOString(),
    } as Sale;
  }

  async pendingCount(storeId: string): Promise<number> {
    return (await this.queue.list(storeId)).length;
  }

  
  async pendingSaleTransactionCount(storeId: string): Promise<number> {
    const items = await this.queue.list(storeId);

    return items.filter(
      (item) => item.entity === 'sale_transaction',
    ).length;
  }


  async sync(storeId: string): Promise<number> {
    
    const allPendingItems = await this.queue.list(storeId);

    console.log(
      '[Gwen][Sync] Detalle de la cola:',
      JSON.stringify(allPendingItems, null, 2),
    );

    console.log(
      '[Gwen][Sync] Cola pendiente (sin payload):',
      allPendingItems.map((item) => ({
        entity: item.entity,
        operation: item.operation,
        entityId: item.entityId,
        attempts: item.attempts,
      })),
    );

    const pendingTransactions = allPendingItems.filter(
      (item) => item.entity === 'sale_transaction',
    );

    console.log(
      '[Gwen][Sync] Ventas pendientes:',
      pendingTransactions.length,
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

    const remaining = await this.pendingCount(storeId);

    console.log('[Gwen][Sync] Operaciones pendientes restantes:', remaining);

    return remaining;
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