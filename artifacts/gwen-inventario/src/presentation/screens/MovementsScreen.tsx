import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import colors from '@/constants/colors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { InventoryMovement } from '@/src/domain/models';

const G = colors.brand;
const SURFACE = colors.light;

type MovementFilter = 'all' | InventoryMovement['type'];

const FILTERS: { key: MovementFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'entry', label: 'Entradas' },
  { key: 'sale', label: 'Ventas' },
  { key: 'adjustment', label: 'Ajustes' },
];

function isMovementFilter(value: unknown): value is MovementFilter {
  return typeof value === 'string' && FILTERS.some((item) => item.key === value);
}

export default function MovementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const { movements, products, loading, refresh, pendingCount } = useProducts();
  const [filter, setFilter] = useState<MovementFilter>(isMovementFilter(filterParam) ? filterParam : 'all');
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const visibleMovements = useMemo(
    () => movements.filter((movement) => filter === 'all' || movement.type === filter),
    [filter, movements],
  );

  return (
    <AppBackground>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver al inicio"
          onPress={() => router.replace('/dashboard')}
          style={({ pressed }) => [styles.back, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={G.onGradientText} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: G.onGradientTextMuted }]}>HISTORIAL</Text>
          <Text style={[styles.title, { color: G.onGradientText }]}>Movimientos</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
          <Feather name="activity" size={19} color={G.onGradientText} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.chips}>
          {FILTERS.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar ${item.label}`}
              onPress={() => setFilter(item.key)}
              style={[
                styles.chip,
                filter === item.key
                  ? { backgroundColor: SURFACE.primary }
                  : { backgroundColor: G.onGradientGlassBg, borderWidth: 1, borderColor: G.onGradientGlassBorder },
              ]}
            >
              <Text style={[styles.chipText, { color: filter === item.key ? '#FFFFFF' : G.onGradientText }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.heading}>
          <View>
            <Text style={[styles.resultTitle, { color: G.onGradientText }]}>{visibleMovements.length} movimiento{visibleMovements.length === 1 ? '' : 's'}</Text>
            <Text style={[styles.resultSubtext, { color: G.onGradientTextMuted }]}>
              {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de sincronización` : 'Historial actualizado'}
            </Text>
          </View>
          <Feather name="clock" size={18} color={G.onGradientTextMuted} />
        </View>
        <FlatList
          data={visibleMovements}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#FFFFFF" />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={<EmptyMovements />}
          renderItem={({ item }) => (
            <MovementRow movement={item} productName={productNames.get(item.productId) ?? 'Producto eliminado'} />
          )}
        />
      </View>
    </AppBackground>
  );
}

function MovementRow({ movement, productName }: { movement: InventoryMovement; productName: string }) {
  const isSale = movement.type === 'sale';
  const accent = isSale ? SURFACE.primary : '#B7791F';
  const typeLabel = movement.type === 'entry' ? 'Entrada' : movement.type === 'sale' ? 'Venta' : 'Ajuste';
  const sign = movement.type === 'entry' ? '+' : movement.type === 'sale' ? '-' : '';
  return (
    <View style={[styles.row, { backgroundColor: SURFACE.card }]}>
      <View style={[styles.rowIcon, { backgroundColor: isSale ? SURFACE.secondary : '#FFF5D6' }]}>
        <Feather name={isSale ? 'shopping-bag' : 'arrow-down-left'} size={18} color={accent} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.productName, { color: SURFACE.cardForeground }]}>{productName}</Text>
          <Text style={[styles.quantity, { color: accent }]}>{sign}{movement.quantity}</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={[styles.metaText, { color: SURFACE.mutedForeground }]}>{typeLabel} · {formatDateTime(movement.occurredAt)}</Text>
          <Text numberOfLines={1} style={[styles.metaText, { color: SURFACE.mutedForeground }]}>Por {movement.userName || 'Usuario'}</Text>
        </View>
        <Text style={[styles.stockAfter, { color: SURFACE.mutedForeground }]}>Stock: {movement.stockBefore} → {movement.stockAfter}</Text>
      </View>
    </View>
  );
}

function EmptyMovements() {
  return (
    <View style={[styles.empty, { borderColor: G.onGradientGlassBorder }]}>
      <View style={[styles.emptyIcon, { backgroundColor: G.onGradientGlassBg }]}>
        <Feather name="activity" size={24} color={G.onGradientText} />
      </View>
      <Text style={[styles.emptyTitle, { color: G.onGradientText }]}>Aún no hay movimientos</Text>
      <Text style={[styles.emptyText, { color: G.onGradientTextMuted }]}>Las entradas y ventas que registres aparecerán aquí con su fecha y hora.</Text>
    </View>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return `${date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 27, fontWeight: '700' },
  headerIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: { borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  resultSubtext: { fontSize: 12, marginTop: 3 },
  list: { gap: 10 },
  row: { borderRadius: 18, padding: 13, flexDirection: 'row', gap: 11 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  productName: { flex: 1, fontSize: 14, fontWeight: '700' },
  quantity: { fontSize: 15, fontWeight: '700' },
  rowMeta: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metaText: { flex: 1, fontSize: 11 },
  stockAfter: { fontSize: 11 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginTop: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 290 },
});