import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { useAuth } from '@/src/presentation/context/AuthContext';
import type { Category, InventoryMovement, Product, Sale } from '@/src/domain/models';
import {
  InventoryService,
  type InventoryScope,
  type MultipleSaleItem,
} from '@/src/services/inventory/inventoryService';
import {
  ProductService,
  type ProductDraft,
} from '@/src/services/products/productService';

type ProductContextValue = {
  products: Product[];
  categories: Category[];
  movements: InventoryMovement[];
  sales: Sale[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pendingCount: number;
  refresh: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  createProduct: (draft: ProductDraft) => Promise<Product>;
  updateProduct: (id: string, draft: ProductDraft) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  recordEntry: (productId: string, quantity: number) => Promise<InventoryMovement>;
  recordSale: (productId: string, quantity: number) => Promise<void>;
  recordMultipleSale: (items: MultipleSaleItem[]) => Promise<void>;
  clearError: () => void;
};

const ProductContext = createContext<ProductContextValue | null>(null);

function readableError(error: unknown): string {
  return error instanceof Error ? error.message : 'No fue posible actualizar el inventario.';
}

export function ProductProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const service = useMemo(
    () => new ProductService(async () => session),
    [session?.accessToken],
  );
  const inventoryService = useMemo(
    () => new InventoryService(async () => session),
    [session?.accessToken],
  );

  const refresh = useCallback(async () => {
  const refreshStartedAt = Date.now();
    const storeId = session?.storeId;
    if (!storeId) {
      setProducts([]);
      setCategories([]);
      setMovements([]);
      setSales([]);
      setPendingCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await service.list(storeId);
      setProducts(result.products);
      setCategories(result.categories);
      const localMovements = await inventoryService.listMovements(storeId);
      setMovements(localMovements);
      setSales(await inventoryService.listSales(storeId));
      await service.sync(storeId);
      const pending = await inventoryService.sync(storeId);
      setPendingCount(pending);
      if (pending === 0 && session.accessToken) {
        const refreshed = await service.list(storeId);
        setProducts(refreshed.products);
        setCategories(refreshed.categories);
      }
      const remoteMovements = await inventoryService.listMovements(storeId);

      console.log('[Gwen][Diagnóstico] Movimientos - tienda:', storeId);
      console.log('[Gwen][Diagnóstico] Movimientos recibidos:', remoteMovements.length);
      console.log('[Gwen][Diagnóstico] Primer movimiento:', remoteMovements[0] ?? null);

      setMovements(remoteMovements);
      const remoteSales = await inventoryService.listSales(storeId);
      console.log('[Gwen][Diagnóstico] Tienda:', storeId);
      console.log('[Gwen][Diagnóstico] Ventas recibidas:', remoteSales.length);
      console.log('[Gwen][Diagnóstico] Primera venta:', remoteSales[0] ?? null);
      setSales(remoteSales);
      setError(null);
    } catch (caught: unknown) {
      setError(readableError(caught));
    } finally {
      console.log(
        `[Gwen][Tiempo] Refresh completo: ${Date.now() - refreshStartedAt} ms`,
      );
      setLoading(false);
    }
  }, [inventoryService, service, session]);

  const refreshProducts = useCallback(async () => {
    const storeId = session?.storeId;

    if (!storeId) {
      setProducts([]);
      setCategories([]);
      return;
    }

    const startedAt = Date.now();

    try {
      const result = await service.list(storeId);
      setProducts(result.products);
      setCategories(result.categories);
      setError(null);

      console.log(
        `[Gwen][Tiempo] Actualización de productos: ${Date.now() - startedAt} ms`,
      );
    } catch (caught: unknown) {
      setError(readableError(caught));
      throw caught;
    }
  }, [service, session?.storeId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

    const runMutation = useCallback(
    async <T,>(
      action: () => Promise<T>,
      refreshAfter: () => Promise<void> = refresh,
    ): Promise<T> => {
      setSaving(true);
      setError(null);
      try {
        const result = await action();
        await refreshAfter();
        return result;
      } catch (caught: unknown) {
        setError(readableError(caught));
        throw caught;
      } finally {
        setSaving(false);
      }
    },
    [refresh, refreshProducts],
  );

  const value = useMemo<ProductContextValue>(
    () => ({
      products,
      categories,
      movements,
      sales,
      loading,
      saving,
      error,
      pendingCount,
      refresh,
      refreshProducts,
      createProduct: (draft) =>
        runMutation(
          () => service.save(session?.storeId ?? '', draft, session?.accessToken),
          refreshProducts,
        ),
      updateProduct: (id, draft) =>
        runMutation(
          () => service.save(session?.storeId ?? '', draft, session?.accessToken, id),
          refreshProducts,
        ),
      deleteProduct: (id) =>
        runMutation(
          () => service.remove(session?.storeId ?? '', id, session?.accessToken),
          refreshProducts,
        ),
      createCategory: (name) =>
        runMutation(
          () => service.createCategory(session?.storeId ?? '', name, session?.accessToken),
          refreshProducts,
        ),
      recordEntry: (productId, quantity) =>
        runMutation(() =>
          inventoryService.recordEntry(
            scopeFromSession(session),
            { productId, quantity },
          ),
        ),
      recordSale: (productId, quantity) =>
        runMutation(async () => {
          await inventoryService.recordSale(
            scopeFromSession(session),
            { productId, quantity },
          );
        }),
      recordMultipleSale: (items) =>
        runMutation(async () => {
          await inventoryService.recordMultipleSale(
            scopeFromSession(session),
            items,
          );
        }),
      clearError: () => setError(null),
    }),
    [
      categories,
      error,
      loading,
      pendingCount,
      products,
      movements,
      sales,
      refresh,
      refreshProducts,
      runMutation,
      saving,
      service,
      session,
      inventoryService,
    ],
  );

    return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

function scopeFromSession(session: ReturnType<typeof useAuth>['session']): InventoryScope {
  if (!session?.storeId || !session.userId) {
    throw new Error('Necesitas una sesión válida vinculada a una tienda.');
  }
  return {
    storeId: session.storeId,
    userId: session.userId,
    userName: session.displayName ?? session.email ?? 'Usuario',
  };
}

export function useProducts(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts debe usarse dentro de ProductProvider.');
  return context;
}