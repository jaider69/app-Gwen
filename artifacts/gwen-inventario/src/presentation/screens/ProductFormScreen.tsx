import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/src/domain/models';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { ProductDraft } from '@/src/services/products/productService';

const EMPTY_DRAFT: ProductDraft = {
  name: '',
  brand: '',
  categoryId: '',
  supplier: '',
  unit: 'unidad',
  stock: 0,
  price: 0,
  minimumStock: 0,
  expiresAt: '',
};

export default function ProductFormScreen({ productId }: { productId?: string }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    products,
    categories,
    loading,
    saving,
    error,
    createProduct,
    updateProduct,
    createCategory,
    clearError,
  } = useProducts();
  const product = useMemo(() => products.find((item) => item.id === productId), [productId, products]);
  const [draft, setDraft] = useState<ProductDraft>(EMPTY_DRAFT);
  const [newCategory, setNewCategory] = useState('');
  const [initializedId, setInitializedId] = useState<string | undefined>();

  useEffect(() => {
    if (productId && product && initializedId !== product.id) {
      setDraft(toDraft(product));
      setInitializedId(product.id);
    }
    if (!productId && !draft.categoryId && categories[0]) {
      setDraft((current) => ({ ...current, categoryId: categories[0].id }));
    }
  }, [categories, draft.categoryId, initializedId, product, productId]);

  const isEditing = Boolean(productId);

  function updateField<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (error) clearError();
  }

  async function submit() {
    try {
      if (isEditing && productId) {
        await updateProduct(productId, draft);
      } else {
        await createProduct(draft);
      }
      router.replace('/products');
    } catch {
      // The context exposes the validation message directly below the form.
    }
  }

  async function addCategory() {
    try {
      const category = await createCategory(newCategory);
      setNewCategory('');
      setDraft((current) => ({ ...current, categoryId: category.id }));
    } catch {
      // The error state is rendered below the form.
    }
  }

  if (isEditing && loading && !product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.centerText, { color: colors.mutedForeground }]}>Cargando producto…</Text>
      </View>
    );
  }

  if (isEditing && !product && !loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={28} color={colors.destructive} />
        <Text style={[styles.centerTitle, { color: colors.foreground }]}>Producto no encontrado</Text>
        <Pressable onPress={() => router.replace('/products')} style={[styles.centerButton, { backgroundColor: colors.primary }]}>
          <Text style={[styles.centerButtonText, { color: colors.primaryForeground }]}>Volver al inventario</Text>
        </Pressable>
      </View>
    );
  }

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
            accessibilityLabel="Volver al inventario"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={colors.primary} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>{isEditing ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{isEditing ? 'Actualiza los datos' : 'Agrega un producto'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Información básica</Text>
          <Field label="Nombre del producto *" value={draft.name} onChangeText={(value) => updateField('name', value)} placeholder="Ej. Arroz blanco 500 g" colors={colors} />
          <Field label="Marca" value={draft.brand} onChangeText={(value) => updateField('brand', value)} placeholder="Ej. Diana" colors={colors} />
          <Field label="Proveedor (opcional)" value={draft.supplier ?? ''} onChangeText={(value) => updateField('supplier', value)} placeholder="Ej. Distribuciones La 14" colors={colors} />
          <Field label="Unidad de venta" value={draft.unit} onChangeText={(value) => updateField('unit', value)} placeholder="unidad, bolsa, caja…" colors={colors} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categoría</Text>
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                accessibilityLabel={`Seleccionar ${category.name}`}
                onPress={() => updateField('categoryId', category.id)}
                style={[
                  styles.categoryOption,
                  {
                    backgroundColor: draft.categoryId === category.id ? colors.primary : colors.card,
                    borderColor: draft.categoryId === category.id ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.categoryOptionText, { color: draft.categoryId === category.id ? colors.primaryForeground : colors.cardForeground }]}>
                  {category.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.newCategoryRow}>
            <TextInput
              accessibilityLabel="Nueva categoría"
              value={newCategory}
              onChangeText={setNewCategory}
              placeholder="Crear categoría personalizada"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.newCategoryInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Crear categoría"
              disabled={!newCategory.trim() || saving}
              onPress={addCategory}
              style={({ pressed }) => [styles.addCategoryButton, { backgroundColor: colors.secondary, opacity: !newCategory.trim() || saving ? 0.45 : pressed ? 0.7 : 1 }]}
            >
              <Feather name="plus" size={19} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Existencias y precio</Text>
          <View style={styles.twoColumns}>
            <Field label="Stock actual *" value={String(draft.stock)} onChangeText={(value) => updateField('stock', numberValue(value))} keyboardType="numeric" colors={colors} />
            <Field label="Stock mínimo *" value={String(draft.minimumStock)} onChangeText={(value) => updateField('minimumStock', numberValue(value))} keyboardType="numeric" colors={colors} />
          </View>
          <Field label="Precio de venta *" value={String(draft.price)} onChangeText={(value) => updateField('price', numberValue(value))} keyboardType="numeric" colors={colors} />
          <Field label="Fecha de vencimiento" value={draft.expiresAt ?? ''} onChangeText={(value) => updateField('expiresAt', value)} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" colors={colors} />
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Los productos vencidos no se eliminan automáticamente. Puedes seguir gestionándolos desde el inventario.</Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
            <Feather name="alert-circle" size={17} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Guardar cambios' : 'Guardar producto'}
          disabled={saving}
          onPress={submit}
          style={({ pressed }) => [styles.submit, { backgroundColor: colors.primary, opacity: saving ? 0.45 : pressed ? 0.78 : 1 }]}
        >
          <Text style={[styles.submitText, { color: colors.primaryForeground }]}>{saving ? 'Guardando…' : isEditing ? 'Guardar cambios' : 'Guardar producto'}</Text>
          <Feather name="check" size={19} color={colors.primaryForeground} />
        </Pressable>

        {isEditing && product ? <DeleteButton product={product} onDeleted={() => router.replace('/products')} colors={colors} /> : null}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function DeleteButton({
  product,
  onDeleted,
  colors,
}: {
  product: Product;
  onDeleted: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { deleteProduct, saving } = useProducts();
  function confirmDelete() {
    Alert.alert('Eliminar producto', `¿Quieres eliminar ${product.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(product.id);
          onDeleted();
        },
      },
    ]);
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Eliminar producto"
      disabled={saving}
      onPress={confirmDelete}
      style={({ pressed }) => [styles.deleteButton, { borderColor: colors.border, opacity: pressed ? 0.7 : saving ? 0.45 : 1 }]}
    >
      <Feather name="trash-2" size={17} color={colors.destructive} />
      <Text style={[styles.deleteText, { color: colors.destructive }]}>Eliminar producto</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType}
        style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
      />
    </View>
  );
}

function numberValue(value: string): number {
  if (!value.trim()) return 0;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function toDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    brand: product.brand,
    categoryId: product.categoryId,
    supplier: product.supplier ?? '',
    unit: product.unit,
    stock: product.stock,
    price: product.price,
    minimumStock: product.minimumStock,
    expiresAt: product.expiresAt ?? '',
  };
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 25, fontWeight: '700' },
  section: { gap: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { minHeight: 49, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  helper: { fontSize: 12, lineHeight: 18 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9 },
  categoryOptionText: { fontSize: 12, fontWeight: '600' },
  newCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  newCategoryInput: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 13 },
  addCategoryButton: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  submit: { minHeight: 55, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitText: { fontSize: 15, fontWeight: '700' },
  deleteButton: { minHeight: 50, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteText: { fontSize: 14, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerText: { fontSize: 15 },
  centerTitle: { fontSize: 20, fontWeight: '700' },
  centerButton: { borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12, marginTop: 5 },
  centerButtonText: { fontSize: 13, fontWeight: '700' },
});