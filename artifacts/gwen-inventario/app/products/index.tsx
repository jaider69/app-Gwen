import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { Product } from '@/src/domain/models';
import { getProductHealth, type ProductStatus } from '@/src/services/products/productService';

type FilterKey = 'all' | ProductStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'low-stock', label: 'Stock bajo' },
  { key: 'out-of-stock', label: 'Agotados' },
  { key: 'expiring', label: 'Por vencer' },
];

export default function ProductsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, categories, loading, refresh, pendingCount } = useProducts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categoryName = (categoryId: string) =>
    categories.find((category) => category.id === categoryId)?.name ?? 'Sin categoría';

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const health = getProductHealth(product);
      const matchesFilter = filter === 'all' || health.status === filter;
      const matchesCategory = !categoryFilter || product.categoryId === categoryFilter;
      const matchesSearch =
        !normalizedSearch ||
        `${product.name} ${product.brand} ${product.supplier ?? ''} ${categoryName(product.categoryId)}`
          .toLocaleLowerCase()
          .includes(normalizedSearch);
      return matchesFilter && matchesCategory && matchesSearch;
    });
  }, [categoryFilter, categories, filter, products, search]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          onPress={() => router.replace('/dashboard')}
          style={({ pressed }) => [styles.back, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>INVENTARIO</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Productos</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agregar producto"
          onPress={() => router.push('/products/new')}
          style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}
        >
          <Feather name="plus" size={21} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            accessibilityLabel="Buscar productos"
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por nombre, marca o categoría"
            placeholderTextColor={colors.mutedForeground}
            style={[styles.searchInput, { color: colors.foreground }]}
          />
          {search ? (
            <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => setSearch('')}>
              <Feather name="x-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.chipsRow}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar ${item.label}`}
              onPress={() => setFilter(item.key)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: filter === item.key ? colors.primary : colors.card },
              ]}
            >
              <Text style={[styles.chipText, { color: filter === item.key ? colors.primaryForeground : colors.mutedForeground }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {categories.length > 0 ? (
          <FlatList
            horizontal
            data={[{ id: 'all', name: 'Todas' }, ...categories]}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${item.name}`}
                onPress={() => setCategoryFilter(item.id === 'all' ? null : item.id)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: (categoryFilter === item.id || (!categoryFilter && item.id === 'all')) ? colors.secondary : colors.background,
                    borderColor: (categoryFilter === item.id || (!categoryFilter && item.id === 'all')) ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryText, { color: colors.cardForeground }]}>{item.name}</Text>
              </Pressable>
            )}
          />
        ) : null}

        <View style={styles.listHeading}>
          <View>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>
              {visibleProducts.length} producto{visibleProducts.length === 1 ? '' : 's'}
            </Text>
            <Text style={[styles.resultSubtext, { color: colors.mutedForeground }]}>
              {pendingCount > 0 ? `${pendingCount} cambio${pendingCount === 1 ? '' : 's'} esperando sincronización` : 'Cambios guardados'}
            </Text>
          </View>
          <Feather name="sliders" size={18} color={colors.mutedForeground} />
        </View>

        <FlatList
          data={visibleProducts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.productList, { paddingBottom: insets.bottom + 24 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyProducts search={search} colors={colors} onAdd={() => router.push('/products/new')} />}
          renderItem={({ item }) => (
            <ProductRow product={item} categoryName={categoryName(item.categoryId)} colors={colors} onPress={() => router.push(`/products/${item.id}`)} />
          )}
        />
      </View>
    </View>
  );
}

function ProductRow({
  product,
  categoryName,
  colors,
  onPress,
}: {
  product: Product;
  categoryName: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const health = getProductHealth(product);
  const statusLabel =
    health.status === 'out-of-stock'
      ? 'Agotado'
      : health.status === 'low-stock'
        ? 'Stock bajo'
        : health.status === 'expiring'
          ? 'Por vencer'
          : 'Normal';
  const statusColor = health.status === 'out-of-stock' ? colors.destructive : health.status === 'normal' ? colors.primary : '#B7791F';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${product.name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.productRow, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[styles.productIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="package" size={19} color={colors.primary} />
      </View>
      <View style={styles.productCopy}>
        <View style={styles.productTitleRow}>
          <Text numberOfLines={1} style={[styles.productName, { color: colors.cardForeground }]}>{product.name}</Text>
          <Text style={[styles.productPrice, { color: colors.cardForeground }]}>${product.price.toLocaleString('es-CO')}</Text>
        </View>
        <Text numberOfLines={1} style={[styles.productMeta, { color: colors.mutedForeground }]}>
          {product.brand || 'Sin marca'} · {categoryName}
        </Text>
        <View style={styles.productBottomRow}>
          <Text style={[styles.stockText, { color: colors.mutedForeground }]}>
            {product.stock} {product.unit} · mín. {product.minimumStock}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: `${statusColor}18` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

function EmptyProducts({
  search,
  colors,
  onAdd,
}: {
  search: string;
  colors: ReturnType<typeof useColors>;
  onAdd: () => void;
}) {
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name={search ? 'search' : 'package'} size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        {search ? 'No encontramos productos' : 'Tu inventario está vacío'}
      </Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
        {search ? 'Prueba con otro nombre, marca o categoría.' : 'Agrega el primer producto para empezar a controlar tu stock.'}
      </Text>
      {!search ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Crear primer producto" onPress={onAdd} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>Agregar producto</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 27, fontWeight: '700' },
  addButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  searchBox: { minHeight: 50, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  chipsRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  categoryList: { gap: 8, paddingVertical: 14 },
  categoryChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  categoryText: { fontSize: 12, fontWeight: '600' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  resultSubtext: { fontSize: 12, marginTop: 3 },
  productList: { gap: 10 },
  productRow: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  productIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  productCopy: { flex: 1, gap: 5 },
  productTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  productName: { flex: 1, fontSize: 15, fontWeight: '700' },
  productPrice: { fontSize: 13, fontWeight: '700' },
  productMeta: { fontSize: 12 },
  productBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  stockText: { fontSize: 11, flex: 1 },
  statusPill: { borderRadius: 12, paddingHorizontal: 7, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 10, fontWeight: '700' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginTop: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 280 },
  emptyButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, marginTop: 4 },
  emptyButtonText: { fontSize: 13, fontWeight: '700' },
});