import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Image,
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

type CartItem = {
  productId: string;
  quantity: number;
};

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
    recordMultipleSale,
    clearError,
  } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityText, setQuantityText] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartError, setCartError] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Función auxiliar para quitar tildes y minúsculas y hacer una búsqueda flexible
  const normalizeText = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  };

  const filteredProducts = useMemo(() => {
    const query = normalizeText(productSearch.trim());
    if (!query) return products;
    return products.filter((p) => {
      const nameNorm = normalizeText(p.name);
      const brandNorm = normalizeText(p.brand);
      return nameNorm.includes(query) || brandNorm.includes(query);
    });
  }, [products, productSearch]);
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

  function addToCart() {
  if (!selectedProduct) {
    setCartError('Selecciona un producto.');
    return;
  }

  if (quantity <= 0) {
    setCartError('Ingresa una cantidad válida.');
    return;
  }

  const existingItem = cart.find(
    (item) => item.productId === selectedProduct.id,
  );

  const newQuantity = (existingItem?.quantity ?? 0) + quantity;

  if (newQuantity > selectedProduct.stock) {
    setCartError(
      `Solo tienes ${selectedProduct.stock} unidades disponibles de ${selectedProduct.name}.`,
    );
    return;
  }

  setCart((current) => {
    const exists = current.some(
      (item) => item.productId === selectedProduct.id,
    );

    if (exists) {
      return current.map((item) =>
        item.productId === selectedProduct.id
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      );
    }

    return [
      ...current,
      {
        productId: selectedProduct.id,
        quantity,
      },
    ];
  });

  setCartError('');
  setQuantityText('');
}

function changeCartQuantity(productId: string, quantity: number) {
  const product = products.find((item) => item.id === productId);

  if (!product || quantity < 1 || quantity > product.stock) {
    return;
  }

  setCart((current) =>
    current.map((item) =>
      item.productId === productId ? { ...item, quantity } : item,
    ),
  );

  setCartError('');
}

function removeFromCart(productId: string) {
  setCart((current) =>
    current.filter((item) => item.productId !== productId),
  );

  setCartError('');
}

const cartTotal = cart.reduce((sum, item) => {
  const product = products.find((product) => product.id === item.productId);
  return sum + (product ? product.price * item.quantity : 0);
}, 0);

  async function submit() {
  try {
    if (mode === 'entry') {
      if (!selectedProduct || quantity <= 0) return;

      await recordEntry(selectedProduct.id, quantity);
    } else {
      if (cart.length === 0) {
        setCartError('Agrega al menos un producto al carrito.');
        return;
      }

      await recordMultipleSale(cart);
    }

    router.replace('/dashboard');
  } catch {
    // El contexto muestra el error en el formulario.
  }
}

  const isEntry = mode === 'entry';

  const submitDisabled =
    saving ||
    (isEntry
      ? !selectedProduct || quantity <= 0
      : cart.length === 0);
  
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
              
              {/* BARRA DE BÚSQUEDA RÁPIDA DE PRODUCTOS */}
              <View style={[styles.searchBox, { backgroundColor: SURFACE.card }]}>
                <Feather name="search" size={16} color={SURFACE.mutedForeground} />
                <TextInput
                  accessibilityLabel="Buscar producto en la lista"
                  value={productSearch}
                  onChangeText={setProductSearch}
                  placeholder="Buscar producto por nombre o marca..."
                  placeholderTextColor={SURFACE.mutedForeground}
                  style={[styles.searchInput, { color: SURFACE.foreground }]}
                />
                {productSearch ? (
                  <Pressable accessibilityLabel="Limpiar búsqueda" onPress={() => setProductSearch('')}>
                    <Feather name="x-circle" size={16} color={SURFACE.mutedForeground} />
                  </Pressable>
                ) : null}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.productPicker}>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <ProductOption
                      key={product.id}
                      product={product}
                      selected={product.id === selectedProductId}
                      onPress={() => setSelectedProductId(product.id)}
                    />
                  ))
                ) : (
                  <Text style={[styles.noResultsText, { color: G.onGradientTextMuted }]}>
                    No se encontraron productos con ese nombre
                  </Text>
                )}
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

            {!isEntry ? (
              <Pressable
                accessibilityRole="button"
                onPress={addToCart}
                style={({ pressed }) => [
                  styles.addCartButton,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Feather name="plus-circle" size={19} color="#FFFFFF" />
                <Text style={styles.submitText}>Agregar al carrito</Text>
              </Pressable>
            ) : null}

            {isEntry ? (
              <View style={[styles.summary, { backgroundColor: SURFACE.card }]}>
                <SummaryRow label="Producto" value={selectedProduct?.name ?? '—'} />
                <SummaryRow
                  label="Stock anterior"
                  value={selectedProduct ? `${selectedProduct.stock} ${selectedProduct.unit}` : '—'}
                />
                <SummaryRow
                  label="Stock nuevo"
                  value={selectedProduct ? `${selectedProduct.stock + quantity} ${selectedProduct.unit}` : '—'}
                  emphasis
                />
              </View>
            ) : (
              <View style={[styles.cartCard, { backgroundColor: SURFACE.card }]}>
                <View style={styles.cartHeader}>
                  <Text style={[styles.sectionTitle, { color: SURFACE.cardForeground }]}>
                    Tu carrito
                  </Text>
                  <Text style={[styles.cartCount, { color: SURFACE.mutedForeground }]}>
                    {cart.length} productos
                  </Text>
                </View>

                {cart.length === 0 ? (
                  <Text style={[styles.cartEmpty, { color: SURFACE.mutedForeground }]}>
                    Todavía no has agregado productos.
                  </Text>
                ) : (
                  cart.map((item) => {
                    const product = products.find(
                      (product) => product.id === item.productId,
                    );

                    if (!product) return null;

                    return (
                      <View key={item.productId} style={styles.cartItem}>
                        {product.image ? (
                          <Image
                            source={{ uri: product.image }}
                            style={styles.cartProductImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <Feather name="package" size={22} color={SURFACE.primary} />
                        )}
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartProductName, { color: SURFACE.cardForeground }]}>
                            {product.name}
                          </Text>
                          <Text style={[styles.cartSubtotal, { color: SURFACE.primary }]}>
                            {formatCurrency(product.price * item.quantity)}
                          </Text>
                          <Text style={[styles.cartUnitPrice, { color: SURFACE.mutedForeground }]}>
                            {formatCurrency(product.price)} por {product.unit}
                          </Text>
                        </View>

                        <View style={styles.cartActions}>
                          <Pressable
                            accessibilityLabel={`Disminuir cantidad de ${product.name}`}
                            onPress={() => changeCartQuantity(item.productId, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            style={styles.quantityButton}
                          >
                            <Feather name="minus" size={15} color={SURFACE.primary} />
                          </Pressable>

                          <Text style={[styles.cartQuantity, { color: SURFACE.cardForeground }]}>
                            {item.quantity}
                          </Text>

                          <Pressable
                            accessibilityLabel={`Aumentar cantidad de ${product.name}`}
                            onPress={() => changeCartQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= product.stock}
                            style={styles.quantityButton}
                          >
                            <Feather name="plus" size={15} color={SURFACE.primary} />
                          </Pressable>

                          <Pressable
                            accessibilityLabel={`Eliminar ${product.name} del carrito`}
                            onPress={() => removeFromCart(item.productId)}
                            style={styles.removeButton}
                          >
                            <Feather name="trash-2" size={17} color={SURFACE.destructive} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  })
                )}

                <View style={styles.cartTotal}>
                  <Text style={[styles.cartTotalLabel, { color: SURFACE.cardForeground }]}>
                    Total de la venta
                  </Text>
                  <Text style={[styles.cartTotalValue, { color: SURFACE.primary }]}>
                    {formatCurrency(cartTotal)}
                  </Text>
                </View>
              </View>
            )}

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
                <Feather name="alert-circle" size={17} color={SURFACE.destructive} />
                <Text style={[styles.errorText, { color: SURFACE.destructive }]}>{error}</Text>
              </View>
            ) : null}

            {cartError ? (
              <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
                <Feather name="alert-circle" size={17} color={SURFACE.destructive} />
                <Text style={[styles.errorText, { color: SURFACE.destructive }]}>
                  {cartError}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEntry ? 'Confirmar entrada' : 'Confirmar venta'}
              disabled={submitDisabled}
              onPress={submit}
              style={({ pressed }) => [
                styles.submit,
                { backgroundColor: SURFACE.primary, opacity: submitDisabled ? 0.45 : pressed ? 0.78 : 1 },
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
      {product.image ? (
        <Image
          source={{ uri: product.image }}
          style={styles.productOptionImage}
          resizeMode="contain"
        />
      ) : (
        <Feather name="package" size={17} color={selected ? '#FFFFFF' : SURFACE.primary} />
      )}
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
  searchBox: { height: 44, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  noResultsText: { fontSize: 13, fontStyle: 'italic', paddingVertical: 10 },
  productPicker: { gap: 9, paddingVertical: 2 },
  productOption: { width: 150, minHeight: 105, borderRadius: 17, padding: 12, gap: 7 },
  productOptionImage: {
  width: 42,
  height: 42,
  borderRadius: 10,
  },
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
    addCartButton: {
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 16,
    backgroundColor: SURFACE.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  cartCard: {
    borderRadius: 18,
    padding: 15,
    gap: 14,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  cartEmpty: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 15,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: SURFACE.border,
  },
    cartProductImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  cartItemInfo: {
    flex: 1,
    gap: 4,
  },
  cartProductName: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartSubtotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  cartUnitPrice: {
    fontSize: 11,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  quantityButton: {
    width: 29,
    height: 29,
    borderRadius: 9,
    backgroundColor: SURFACE.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQuantity: {
    minWidth: 18,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  removeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartTotal: {
    borderTopWidth: 1,
    borderTopColor: SURFACE.border,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  cartTotalValue: {
    fontSize: 19,
    fontWeight: '800',
  },
});