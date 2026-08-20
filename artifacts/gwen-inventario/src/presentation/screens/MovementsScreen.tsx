import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { InventoryMovement } from '@/src/domain/models';

type MovementFilter = 'all' | InventoryMovement['type'];

const FILTERS: { key: MovementFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'entry', label: 'Entradas' },
  { key: 'sale', label: 'Ventas' },
  { key: 'adjustment', label: 'Ajustes' },
];

export default function MovementsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { movements, products, loading, refresh, pendingCount } = useProducts();
  const [filter, setFilter] = useState<MovementFilter>('all');
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product.name])), [products]);
  const visibleMovements = useMemo(
    () => movements.filter((movement) => filter === 'all' || movement.type === filter),
    [filter, movements],
  );

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
          <Text style={[styles.eyebrow, { color: colors.primary }]}>HISTORIAL</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Movimientos</Text>
        </View>
        <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="activity" size={19} color={colors.primary} />
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
              style={[styles.chip, { backgroundColor: filter === item.key ? colors.primary : colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.chipText, { color: filter === item.key ? colors.primaryForeground : colors.mutedForeground }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.heading}>
          <View>
            <Text style={[styles.resultTitle, { color: colors.foreground }]}>{visibleMovements.length} movimiento{visibleMovements.length === 1 ? '' : 's'}</Text>
            <Text style={[styles.resultSubtext, { color: colors.mutedForeground }]}>
              {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'} de sincronización` : 'Historial actualizado'}
            </Text>
          </View>
          <Feather name="clock" size={18} color={colors.mutedForeground} />
        </View>
        <FlatList
          data={visibleMovements}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={<EmptyMovements colors={colors} />}
          renderItem={({ item }) => (
            <MovementRow movement={item} productName={productNames.get(item.productId) ?? 'Producto eliminado'} colors={colors} />
          )}
        />
      </View>
    </View>
  );
}

function MovementRow({
  movement,
  productName,
  colors,
}: {
  movement: InventoryMovement;
  productName: string;
  colors: ReturnType<typeof useColors>;
}) {
  const isSale = movement.type === 'sale';
  const accent = isSale ? colors.primary : '#B7791F';
  const typeLabel = movement.type === 'entry' ? 'Entrada' : movement.type === 'sale' ? 'Venta' : 'Ajuste';
  const sign = movement.type === 'entry' ? '+' : movement.type === 'sale' ? '-' : '';
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: isSale ? colors.secondary : '#FFF5D6' }]}>
        <Feather name={isSale ? 'shopping-bag' : 'arrow-down-left'} size={18} color={accent} />
      </View>
      <View style={styles.rowCopy}>
        <View style={styles.rowTop}>
          <Text numberOfLines={1} style={[styles.productName, { color: colors.cardForeground }]}>{productName}</Text>
          <Text style={[styles.quantity, { color: accent }]}>{sign}{movement.quantity}</Text>
        </View>
        <View style={styles.rowMeta}>
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{typeLabel} · {formatDateTime(movement.occurredAt)}</Text>
          <Text numberOfLines={1} style={[styles.metaText, { color: colors.mutedForeground }]}>Por {movement.userName || 'Usuario'}</Text>
        </View>
        <Text style={[styles.stockAfter, { color: colors.mutedForeground }]}>Stock: {movement.stockBefore} → {movement.stockAfter}</Text>
      </View>
    </View>
  );
}

function EmptyMovements({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.empty, { borderColor: colors.border }]}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Feather name="activity" size={24} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aún no hay movimientos</Text>
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Las entradas y ventas que registres aparecerán aquí con su fecha y hora.</Text>
    </View>
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return `${date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 27, fontWeight: '700' },
  headerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 18 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 12, fontWeight: '700' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  resultSubtext: { fontSize: 12, marginTop: 3 },
  list: { gap: 10 },
  row: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', gap: 11 },
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