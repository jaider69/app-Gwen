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
import type { Category, Product } from '@/src/domain/models';
import {
  ProductService,
  type ProductDraft,
} from '@/src/services/products/productService';

type ProductContextValue = {
  products: Product[];
  categories: Category[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  pendingCount: number;
  refresh: () => Promise<void>;
  createProduct: (draft: ProductDraft) => Promise<Product>;
  updateProduct: (id: string, draft: ProductDraft) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const service = useMemo(
    () => new ProductService(async () => session),
    [session?.accessToken],
  );

  const refresh = useCallback(async () => {
    const storeId = session?.storeId;
    if (!storeId) {
      setProducts([]);
      setCategories([]);
      setPendingCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await service.list(storeId);
      setProducts(result.products);
      setCategories(result.categories);
      const pending = await service.sync(storeId);
      setPendingCount(pending);
      if (pending === 0 && session.accessToken) {
        const refreshed = await service.list(storeId);
        setProducts(refreshed.products);
        setCategories(refreshed.categories);
      }
      setError(null);
    } catch (caught: unknown) {
      setError(readableError(caught));
    } finally {
      setLoading(false);
    }
  }, [service, session]);

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
      clearError: () => setError(null),
    }),
    [
      categories,
      error,
      loading,
      pendingCount,
      products,
      refresh,
      runMutation,
      saving,
      service,
      session,
    ],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}

export function useProducts(): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts debe usarse dentro de ProductProvider.');
  return context;
}