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

import { AppBackground } from '@/components/AppBackground';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { Product } from '@/src/domain/models';

const G = colors.brand;
const SURFACE = colors.light;

type TransactionMode = 'entry' | 'sale';

export default function TransactionFormScreen({ mode }: { mode: TransactionMode }) {
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
    <AppBackground>
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
            style={({ pressed }) => [styles.back, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={G.onGradientText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: G.onGradientTextMuted }]}>{isEntry ? 'ENTRADA DE INVENTARIO' : 'NUEVA VENTA'}</Text>
            <Text style={[styles.title, { color: G.onGradientText }]}>{isEntry ? 'Recibir productos' : 'Registrar una venta'}</Text>
          </View>
        </View>

        <View style={[styles.introCard, { backgroundColor: SURFACE.card }]}>
          <View style={[styles.introIcon, { backgroundColor: isEntry ? SURFACE.secondary : SURFACE.primary }]}>
            <Feather name={isEntry ? 'arrow-down-left' : 'shopping-bag'} size={20} color={isEntry ? SURFACE.primary : '#FFFFFF'} />
          </View>
          <View style={styles.introCopy}>
            <Text style={[styles.introTitle, { color: SURFACE.cardForeground }]}>
              {isEntry ? 'Suma existencias sin perder el historial' : 'El precio se toma del producto'}
            </Text>
            <Text style={[styles.introText, { color: SURFACE.mutedForeground }]}>
              {isEntry
                ? 'Registra cuántas unidades recibiste y el stock se actualizará automáticamente.'
                : 'No tienes que escribir el precio. Gwen usa el precio de venta guardado en el catálogo.'}
            </Text>
          </View>
        </View>

        {products.length === 0 && !loading ? (
          <View style={[styles.empty, { borderColor: G.onGradientGlassBorder }]}>
            <Feather name="package" size={25} color={G.onGradientText} />
            <Text style={[styles.emptyTitle, { color: G.onGradientText }]}>Primero agrega un producto</Text>
            <Text style={[styles.emptyText, { color: G.onGradientTextMuted }]}>Necesitas un producto para registrar {isEntry ? 'una entrada' : 'una venta'}.</Text>
            <Pressable onPress={() => router.replace('/products/new')} style={[styles.emptyButton, { backgroundColor: SURFACE.primary }]}>
              <Text style={styles.emptyButtonText}>Agregar producto</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: G.onGradientText }]}>1. Selecciona el producto</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>
                {products.map((product) => (
                  <ProductOption
                    key={product.id}
                    product={product}
                    selected={product.id === selectedProductId}
                    onPress={() => setSelectedProductId(product.id)}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: G.onGradientText }]}>2. Indica la cantidad</Text>
              <View style={[styles.quantityCard, { backgroundColor: SURFACE.card }]}>
                <View style={styles.quantityCopy}>
                  <Text style={[styles.quantityLabel, { color: SURFACE.mutedForeground }]}>{isEntry ? 'Cantidad recibida' : 'Cantidad a vender'}</Text>
                  <Text style={[styles.quantityHint, { color: SURFACE.mutedForeground }]}>
                    {selectedProduct ? `Disponible: ${selectedProduct.stock} ${selectedProduct.unit}` : 'Selecciona un producto'}
                  </Text>
                </View>
                <TextInput
                  accessibilityLabel={isEntry ? 'Cantidad recibida' : 'Cantidad a vender'}
                  value={quantityText}
                  onChangeText={updateQuantity}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={SURFACE.mutedForeground}
                  style={[styles.quantityInput, { color: SURFACE.foreground, backgroundColor: SURFACE.secondary }]}
                />
              </View>
            </View>

            <View style={[styles.summary, { backgroundColor: SURFACE.card }]}>
              <SummaryRow label="Producto" value={selectedProduct?.name ?? '—'} />
              <SummaryRow label="Stock anterior" value={selectedProduct ? `${selectedProduct.stock} ${selectedProduct.unit}` : '—'} />
              <SummaryRow label={isEntry ? 'Stock nuevo' : 'Stock después de la venta'} value={selectedProduct ? `${isEntry ? selectedProduct.stock + quantity : Math.max(0, selectedProduct.stock - quantity)} ${selectedProduct.unit}` : '—'} emphasis />
              {!isEntry ? <SummaryRow label="Precio fijo" value={selectedProduct ? formatCurrency(selectedProduct.price) : '—'} /> : null}
              {!isEntry ? <SummaryRow label="Total de la venta" value={formatCurrency(total)} emphasis /> : null}
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
                <Feather name="alert-circle" size={17} color={SURFACE.destructive} />
                <Text style={[styles.errorText, { color: SURFACE.destructive }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEntry ? 'Confirmar entrada' : 'Confirmar venta'}
              disabled={saving || !selectedProduct || quantity <= 0}
              onPress={submit}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: SURFACE.primary, opacity: saving || !selectedProduct || quantity <= 0 ? 0.45 : pressed ? 0.78 : 1 },
              ]}
            >
              <Text style={styles.submitText}>{saving ? 'Guardando…' : isEntry ? 'Confirmar entrada' : 'Confirmar venta'}</Text>
              <Feather name="check" size={19} color="#FFFFFF" />
            </Pressable>
          </>
        )}
      </KeyboardAwareScrollViewCompat>
    </AppBackground>
  );
}

function ProductOption({
  product,
  selected,
  onPress,
}: {
  product: Product;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Seleccionar ${product.name}`}
      onPress={onPress}
      style={[
        styles.productOption,
        { backgroundColor: selected ? SURFACE.primary : SURFACE.card },
      ]}
    >
      <Feather name="package" size={17} color={selected ? '#FFFFFF' : SURFACE.primary} />
      <Text numberOfLines={1} style={[styles.productOptionName, { color: selected ? '#FFFFFF' : SURFACE.cardForeground }]}>{product.name}</Text>
      <Text style={[styles.productOptionStock, { color: selected ? 'rgba(255,255,255,0.85)' : SURFACE.mutedForeground }]}>{product.stock} disponibles</Text>
    </Pressable>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: SURFACE.mutedForeground }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: emphasis ? SURFACE.primary : SURFACE.cardForeground, fontWeight: emphasis ? '700' : '600' }]}>{value}</Text>
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
  content: { paddingHorizontal: 20, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
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
  productOption: { width: 150, minHeight: 105, borderRadius: 17, padding: 12, gap: 7 },
  productOptionName: { fontSize: 13, fontWeight: '700' },
  productOptionStock: { fontSize: 11 },
  quantityCard: { minHeight: 84, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityCopy: { flex: 1, gap: 4 },
  quantityLabel: { fontSize: 13, fontWeight: '700' },
  quantityHint: { fontSize: 11 },
  quantityInput: { width: 82, height: 56, borderRadius: 15, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  summary: { borderRadius: 18, padding: 15, gap: 13 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, maxWidth: '62%', textAlign: 'right' },
  errorBox: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  submit: { minHeight: 55, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyButton: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11, marginTop: 4 },
  emptyButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});