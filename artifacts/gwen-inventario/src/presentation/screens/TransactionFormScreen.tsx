import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { Product } from '@/src/domain/models';

type TransactionMode = 'entry' | 'sale';

export default function TransactionFormScreen({ mode }: { mode: TransactionMode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    products,
    loading,
    saving,
    error,
    recordEntry,
    recordSale,
    clearError,
  } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId],
  );
  const quantity = parseQuantity(quantityText);
  const total = selectedProduct ? selectedProduct.price * quantity : 0;

  useEffect(() => {
    if (!selectedProductId && products[0]) setSelectedProductId(products[0].id);
  }, [products, selectedProductId]);

  function updateQuantity(value: string) {
    setQuantityText(value.replace(/[^\d]/g, ''));
    if (error) clearError();
  }

  async function submit() {
    if (!selectedProduct) {
      return;
    }
    try {
      if (mode === 'entry') await recordEntry(selectedProduct.id, quantity);
      else await recordSale(selectedProduct.id, quantity);
      router.replace('/dashboard');
    } catch {
      // The context error is shown in the form.
    }
  }

  const isEntry = mode === 'entry';
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al inicio"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{isEntry ? 'ENTRADA DE INVENTARIO' : 'NUEVA VENTA'}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{isEntry ? 'Recibir productos' : 'Registrar una venta'}</Text>
          </View>
        </View>

        <View style={[styles.introCard, { backgroundColor: isEntry ? colors.secondary : colors.primary }]}>
          <View style={[styles.introIcon, { backgroundColor: isEntry ? colors.primary : colors.primaryForeground }]}>
            <Feather name={isEntry ? 'arrow-down-left' : 'shopping-bag'} size={20} color={isEntry ? colors.primaryForeground : colors.primary} />
          </View>
          <View style={styles.introCopy}>
            <Text style={[styles.introTitle, { color: isEntry ? colors.secondaryForeground : colors.primaryForeground }]}>
              {isEntry ? 'Suma existencias sin perder el historial' : 'El precio se toma del producto'}
            </Text>
            <Text style={[styles.introText, { color: isEntry ? colors.mutedForeground : colors.secondaryForeground }]}>
              {isEntry
                ? 'Registra cuántas unidades recibiste y el stock se actualizará automáticamente.'
                : 'No tienes que escribir el precio. Gwen usa el precio de venta guardado en el catálogo.'}
            </Text>
          </View>
        </View>

        {products.length === 0 && !loading ? (
          <View style={[styles.empty, { borderColor: colors.border }]}>
            <Feather name="package" size={25} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Primero agrega un producto</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Necesitas un producto para registrar {isEntry ? 'una entrada' : 'una venta'}.</Text>
            <Pressable onPress={() => router.replace('/products/new')} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
              <Text style={[styles.emptyButtonText, { color: colors.primaryForeground }]}>Agregar producto</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>1. Selecciona el producto</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>
                {products.map((product) => (
                  <ProductOption
                    key={product.id}
                    product={product}
                    selected={product.id === selectedProductId}
                    colors={colors}
                    onPress={() => setSelectedProductId(product.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>2. Indica la cantidad</Text>
              <View style={[styles.quantityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.quantityCopy}>
                  <Text style={[styles.quantityLabel, { color: colors.mutedForeground }]}>{isEntry ? 'Cantidad recibida' : 'Cantidad a vender'}</Text>
                  <Text style={[styles.quantityHint, { color: colors.mutedForeground }]}>
                    {selectedProduct ? `Disponible: ${selectedProduct.stock} ${selectedProduct.unit}` : 'Selecciona un producto'}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={isEntry ? 'Cantidad recibida' : 'Cantidad a vender'}
                  value={quantityText}
                  onChangeText={updateQuantity}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.mutedForeground}
                  style={[styles.quantityInput, { color: colors.foreground, borderColor: colors.border }]}
                />
              </View>
            </View>

            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SummaryRow label="Producto" value={selectedProduct?.name ?? '—'} colors={colors} />
              <SummaryRow label="Stock anterior" value={selectedProduct ? `${selectedProduct.stock} ${selectedProduct.unit}` : '—'} colors={colors} />
              <SummaryRow label={isEntry ? 'Stock nuevo' : 'Stock después de la venta'} value={selectedProduct ? `${isEntry ? selectedProduct.stock + quantity : Math.max(0, selectedProduct.stock - quantity)} ${selectedProduct.unit}` : '—'} colors={colors} emphasis />
              {!isEntry ? <SummaryRow label="Precio fijo" value={selectedProduct ? formatCurrency(selectedProduct.price) : '—'} colors={colors} /> : null}
              {!isEntry ? <SummaryRow label="Total de la venta" value={formatCurrency(total)} colors={colors} emphasis /> : null}
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
                <Feather name="alert-circle" size={17} color={colors.destructive} />
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEntry ? 'Confirmar entrada' : 'Confirmar venta'}
              disabled={saving || !selectedProduct || quantity <= 0}
              onPress={submit}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: colors.primary, opacity: saving || !selectedProduct || quantity <= 0 ? 0.45 : pressed ? 0.78 : 1 },
              ]}
            >
              <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{saving ? 'Guardando…' : isEntry ? 'Confirmar entrada' : 'Confirmar venta'}</Text>
              <Feather name="check" size={19} color={colors.primaryForeground} />
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function ProductOption({
  product,
  selected,
  colors,
  onPress,
}: {
  product: Product;
  selected: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Seleccionar ${product.name}`}
      onPress={onPress}
      style={[
        styles.productOption,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Feather name="package" size={17} color={selected ? colors.primaryForeground : colors.primary} />
      <Text numberOfLines={1} style={[styles.productOptionName, { color: selected ? colors.primaryForeground : colors.cardForeground }]}>{product.name}</Text>
      <Text style={[styles.productOptionStock, { color: selected ? colors.secondaryForeground : colors.mutedForeground }]}>{product.stock} disponibles</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  colors,
  emphasis = false,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: emphasis ? colors.primary : colors.cardForeground, fontWeight: emphasis ? '700' : '600' }]}>{value}</Text>
    </View>
  );
}

function parseQuantity(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CO')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 25, fontWeight: '700' },
  introCard: { borderRadius: 20, padding: 16, flexDirection: 'row', gap: 12 },
  introIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  introCopy: { flex: 1, gap: 5 },
  introTitle: { fontSize: 15, fontWeight: '700' },
  introText: { fontSize: 12, lineHeight: 18 },
  section: { gap: 11 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  productPicker: { gap: 9, paddingVertical: 2 },
  productOption: { width: 150, minHeight: 105, borderWidth: 1, borderRadius: 17, padding: 12, gap: 7 },
  productOptionName: { fontSize: 13, fontWeight: '700' },
  productOptionStock: { fontSize: 11 },
  quantityCard: { minHeight: 84, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityCopy: { flex: 1, gap: 4 },
  quantityLabel: { fontSize: 13, fontWeight: '700' },
  quantityHint: { fontSize: 11 },
  quantityInput: { width: 82, height: 56, borderWidth: 1, borderRadius: 15, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  summary: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 13 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, maxWidth: '62%', textAlign: 'right' },
  errorBox: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  submit: { minHeight: 55, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitText: { fontSize: 15, fontWeight: '700' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, marginTop: 4 },
  emptyButtonText: { fontSize: 13, fontWeight: '700' },
});