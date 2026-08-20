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
  createProduct: (draft: ProductDraft) => Promise<Product>;
  updateProduct: (id: string, draft: ProductDraft) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
  recordEntry: (productId: string, quantity: number) => Promise<InventoryMovement>;
  recordSale: (productId: string, quantity: number) => Promise<void>;
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
      setMovements(await inventoryService.listMovements(storeId));
      setSales(await inventoryService.listSales(storeId));
      setError(null);
    } catch (caught: unknown) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, [inventoryService, service, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runMutation = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T> => {
      setSaving(true);
      setError(null);
      try {
        const result = await action();
        await refresh();
        return result;
      } catch (caught: unknown) {
        setError(readableError(caught));
        throw caught;
      } finally {
        setSaving(false);
      }
    },
    [refresh],
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
      createProduct: (draft) =>
        runMutation(() => service.save(session?.storeId ?? '', draft, session?.accessToken)),
      updateProduct: (id, draft) =>
        runMutation(() => service.save(session?.storeId ?? '', draft, session?.accessToken, id)),
      deleteProduct: (id) =>
        runMutation(() => service.remove(session?.storeId ?? '', id, session?.accessToken)),
      createCategory: (name) =>
        runMutation(() => service.createCategory(session?.storeId ?? '', name, session?.accessToken)),
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