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
import { Image } from 'react-native';

import {
  assignSharedProductImage,
  isRemoteProductAvailable,
  listSharedProductImages,
  pickProductImageFromGallery,
  takeProductImageWithCamera,
  uploadStoreProductImage,
  type ProductCatalogImage,
} from '@/src/services/products/productImageService';
import { useAuth } from '@/src/presentation/context/AuthContext';
import { AppBackground } from '@/components/AppBackground';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';
import type { Product } from '@/src/domain/models';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { ProductDraft } from '@/src/services/products/productService';

const G = colors.brand;
const SURFACE = colors.light;


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
    refreshProducts,
  } = useProducts();

  const { session } = useAuth();
  const storeId = session?.storeId ?? null;

  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [selectedImageMimeType, setSelectedImageMimeType] = useState<string | null>(null);
  const [selectedCatalogImageId, setSelectedCatalogImageId] = useState<string | null>(null);
  const [catalogImages, setCatalogImages] = useState<ProductCatalogImage[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
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

  useEffect(() => {
  let cancelled = false;

  async function loadCatalogImages() {
    setLoadingCatalog(true);

    try {
      const images = await listSharedProductImages();

      if (!cancelled) {
        setCatalogImages(images);
      }
    } catch {
      if (!cancelled) {
        setCatalogImages([]);
      }
    } finally {
      if (!cancelled) {
        setLoadingCatalog(false);
      }
    }
  }

  void loadCatalogImages();

  return () => {
    cancelled = true;
  };
}, []);

  function updateField<Key extends keyof ProductDraft>(key: Key, value: ProductDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (error) clearError();
  }

  function selectCatalogImage(image: ProductCatalogImage) {
  setSelectedCatalogImageId(image.id);
  setSelectedImageUri(image.url);
  setSelectedImageMimeType(null);
  setDraft((current) => ({
    ...current,
    image: image.url,
  }));
}

  function formatDateInput(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    return [year, month, day].filter(Boolean).join('-');
  }


  async function submit() {
    let savedProduct: Product;

    try {
      if (isEditing && productId) {
        savedProduct = await updateProduct(productId, draft);
      } else {
        savedProduct = await createProduct(draft);
      }
    } catch {
      // El contexto muestra el error de validación debajo del formulario.
      return;
    }

    // Si no se eligió una imagen nueva, conserva el flujo normal.
    if (!selectedCatalogImageId && !selectedImageUri) {
      router.replace('/products');
      return;
    }

    // El producto puede haberse guardado localmente, sin existir aún
    // en Supabase. En ese caso no intentamos subir ni asignar la imagen.
    if (!storeId) {
      Alert.alert(
        'Producto guardado',
        'No se encontró la tienda de la sesión para guardar la imagen en línea.',
      );
      router.replace('/products');
      return;
    }

    setSavingImage(true);

    try {
      const remoteCheckStartedAt = Date.now();
      const existsRemotely = await isRemoteProductAvailable(savedProduct.id);

      console.log(
        `[Gwen][Tiempo] Comprobación producto remoto: ${Date.now() - remoteCheckStartedAt} ms`,
      );

      if (!existsRemotely) {
        Alert.alert(
          'Producto guardado',
          'La imagen se conserva en el registro local, pero no se puede subir a Supabase hasta que el producto exista en el catálogo remoto.',
        );
        router.replace('/products');
        return;
      }

      if (selectedCatalogImageId) {
        const imageStartedAt = Date.now();

        await assignSharedProductImage(
          storeId,
          savedProduct.id,
          selectedCatalogImageId,
          true,
        );

        console.log(
          `[Gwen][Tiempo] Asignación imagen catálogo: ${Date.now() - imageStartedAt} ms`,
        );
      } else if (selectedImageUri) {
        const imageStartedAt = Date.now();

        await uploadStoreProductImage(
          storeId,
          savedProduct.id,
          selectedImageUri,
          selectedImageMimeType,
        );

        console.log(
          `[Gwen][Tiempo] Subida imagen propia: ${Date.now() - imageStartedAt} ms`,
        );
      }

      await refreshProducts();
      router.replace('/products');
    } catch (imageError) {
      const message =
        imageError instanceof Error
          ? imageError.message
          : 'No fue posible guardar la imagen en línea.';

      Alert.alert(
        'Producto guardado, imagen pendiente',
        `${message}\n\nPuedes volver a editar el producto e intentarlo de nuevo.`,
      );
      router.replace('/products');
    } finally {
      setSavingImage(false);
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
      <AppBackground>
        <View style={styles.center}>
          <Text style={[styles.centerText, { color: G.onGradientTextMuted }]}>Cargando producto…</Text>
        </View>
      </AppBackground>
    );
  }

  if (isEditing && !product && !loading) {
    return (
      <AppBackground>
        <View style={styles.center}>
          <Feather name="alert-circle" size={28} color="#F28383" />
          <Text style={[styles.centerTitle, { color: G.onGradientText }]}>Producto no encontrado</Text>
          <Pressable onPress={() => router.replace('/products')} style={[styles.centerButton, { backgroundColor: SURFACE.primary }]}>
            <Text style={styles.centerButtonText}>Volver al inventario</Text>
          </Pressable>
        </View>
      </AppBackground>
    );
  }

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
            accessibilityLabel="Volver al inventario"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.back, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="arrow-left" size={20} color={G.onGradientText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: G.onGradientTextMuted }]}>{isEditing ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}</Text>
            <Text style={[styles.title, { color: G.onGradientText }]}>{isEditing ? 'Actualiza los datos' : 'Agrega un producto'}</Text>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: SURFACE.card }]}>
          <Text style={[styles.sectionTitle, { color: SURFACE.cardForeground }]}>
            Imagen del producto
          </Text>

          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.productImagePreview}
              resizeMode="contain"
            />
          ) : product?.image ? (
            <Image
              source={{ uri: product.image }}
              style={styles.productImagePreview}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.productImagePlaceholder, { backgroundColor: SURFACE.secondary }]}>
              <Feather name="image" size={36} color={SURFACE.mutedForeground} />
              <Text style={[styles.helper, { color: SURFACE.mutedForeground }]}>
                No has seleccionado una imagen
              </Text>
            </View>
          )}

          <View style={styles.imageActions}>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const picked = await pickProductImageFromGallery();
                if (picked) {
                  setSelectedImageUri(picked.uri);
                  setSelectedImageMimeType(picked.mimeType);
                  setSelectedCatalogImageId(null);
                  setDraft((current) => ({
                    ...current,
                    image: picked.uri,
                  }));
                }
              }}
              style={[styles.imageActionButton, { backgroundColor: SURFACE.secondary }]}
            >
              <Feather name="image" size={18} color={SURFACE.primary} />
              <Text style={[styles.imageActionText, { color: SURFACE.foreground }]}>
                Galería
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                const picked = await takeProductImageWithCamera();
                if (picked) {
                  setSelectedImageUri(picked.uri);
                  setSelectedImageMimeType(picked.mimeType);
                  setSelectedCatalogImageId(null);
                  setDraft((current) => ({
                    ...current,
                    image: picked.uri,
                  }));
                }
              }}
              style={[styles.imageActionButton, { backgroundColor: SURFACE.secondary }]}
            >
              <Feather name="camera" size={18} color={SURFACE.primary} />
              <Text style={[styles.imageActionText, { color: SURFACE.foreground }]}>
                Cámara
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { color: SURFACE.mutedForeground }]}>
            Catálogo compartido
          </Text>

          {loadingCatalog ? (
            <Text style={[styles.helper, { color: SURFACE.mutedForeground }]}>
              Cargando imágenes…
            </Text>
          ) : catalogImages.length === 0 ? (
            <Text style={[styles.helper, { color: SURFACE.mutedForeground }]}>
              No hay imágenes compartidas disponibles.
            </Text>
          ) : (
            <View style={styles.catalogGrid}>
              {catalogImages.map((image) => (
                <Pressable
                  key={image.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar imagen ${image.name}`}
                  onPress={() => selectCatalogImage(image)}
                  style={[
                    styles.catalogOption,
                    {
                      borderColor:
                        selectedCatalogImageId === image.id
                          ? SURFACE.primary
                          : SURFACE.border,
                      borderWidth: selectedCatalogImageId === image.id ? 2 : 1,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: image.url }}
                    style={styles.catalogImage}
                    resizeMode="contain"
                  />
                  <Text
                    numberOfLines={2}
                    style={[styles.catalogImageName, { color: SURFACE.foreground }]}
                  >
                    {image.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: SURFACE.card }]}>
          
          <Text style={[styles.sectionTitle, { color: SURFACE.cardForeground }]}>Información básica</Text>
          <Field label="Nombre del producto *" value={draft.name} onChangeText={(value) => updateField('name', value)} placeholder="Ej. Arroz blanco 500 g" />
          <Field label="Marca" value={draft.brand} onChangeText={(value) => updateField('brand', value)} placeholder="Ej. Diana" />
          <Field label="Proveedor (opcional)" value={draft.supplier ?? ''} onChangeText={(value) => updateField('supplier', value)} placeholder="Ej. Distribuciones La 14" />
          <Field label="Unidad de venta" value={draft.unit} onChangeText={(value) => updateField('unit', value)} placeholder="unidad, bolsa, caja…" />
        </View>

        <View style={[styles.sectionCard, { backgroundColor: SURFACE.card }]}>
          <Text style={[styles.sectionTitle, { color: SURFACE.cardForeground }]}>Categoría</Text>
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
                    backgroundColor: draft.categoryId === category.id ? SURFACE.primary : SURFACE.secondary,
                  },
                ]}
              >
                <Text style={[styles.categoryOptionText, { color: draft.categoryId === category.id ? '#FFFFFF' : SURFACE.secondaryForeground }]}>
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
              placeholderTextColor={SURFACE.mutedForeground}
              style={[styles.newCategoryInput, { backgroundColor: SURFACE.secondary, color: SURFACE.foreground }]}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Crear categoría"
              disabled={!newCategory.trim() || saving}
              onPress={addCategory}
              style={({ pressed }) => [styles.addCategoryButton, { backgroundColor: SURFACE.secondary, opacity: !newCategory.trim() || saving ? 0.45 : pressed ? 0.7 : 1 }]}
            >
              <Feather name="plus" size={19} color={SURFACE.primary} />
            </Pressable>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: SURFACE.card }]}>
          <Text style={[styles.sectionTitle, { color: SURFACE.cardForeground }]}>Existencias y precio</Text>
          <View style={styles.twoColumns}>
            <Field label="Stock actual *" value={String(draft.stock)} onChangeText={(value) => updateField('stock', numberValue(value))} keyboardType="numeric" />
            <Field label="Stock mínimo *" value={String(draft.minimumStock)} onChangeText={(value) => updateField('minimumStock', numberValue(value))} keyboardType="numeric" />
          </View>
          <Field label="Precio de venta *" value={String(draft.price)} onChangeText={(value) => updateField('price', numberValue(value))} keyboardType="numeric" />
          <Field label="Fecha de vencimiento" value={draft.expiresAt ?? ''} onChangeText={(value) => updateField('expiresAt', formatDateInput(value))} placeholder="AAAA-MM-DD" keyboardType="number-pad" />
          <Text style={[styles.helper, { color: SURFACE.mutedForeground }]}>Los productos vencidos no se eliminan automáticamente. Puedes seguir gestionándolos desde el inventario.</Text>
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: '#FCEBEB' }]}>
            <Feather name="alert-circle" size={17} color={SURFACE.destructive} />
            <Text style={[styles.errorText, { color: SURFACE.destructive }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isEditing ? 'Guardar cambios' : 'Guardar producto'}
          disabled={saving || savingImage}
          onPress={submit}
          style={({ pressed }) => [styles.submit, { backgroundColor: SURFACE.primary, opacity: saving || savingImage ? 0.45 : pressed ? 0.78 : 1 }]}
        >
          <Text style={styles.submitText}>
            {savingImage
              ? 'Guardando imagen…'
              : saving
                ? 'Guardando…'
                : isEditing
                  ? 'Guardar cambios'
                  : 'Guardar producto'}
          </Text>
          <Feather name="check" size={19} color="#FFFFFF" />
        </Pressable>

        {isEditing && product ? <DeleteButton product={product} onDeleted={() => router.replace('/products')} /> : null}
      </KeyboardAwareScrollViewCompat>
    </AppBackground>
  );
}

function DeleteButton({ product, onDeleted }: { product: Product; onDeleted: () => void }) {
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
      style={({ pressed }) => [styles.deleteButton, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.7 : saving ? 0.45 : 1 }]}
    >
      <Feather name="trash-2" size={17} color="#FF9D9D" />
      <Text style={styles.deleteText}>Eliminar producto</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: SURFACE.mutedForeground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={SURFACE.mutedForeground}
        keyboardType={keyboardType}
        style={[styles.input, { backgroundColor: SURFACE.secondary, color: SURFACE.foreground }]}
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
    image: product.image,
  };
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 25, fontWeight: '700' },
  sectionCard: { borderRadius: 20, padding: 16, gap: 13 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  field: { gap: 7 },
  label: { fontSize: 12, fontWeight: '600' },
  input: { minHeight: 49, borderRadius: 15, paddingHorizontal: 14, fontSize: 14 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  helper: { fontSize: 12, lineHeight: 18 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryOption: { borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9 },
  categoryOptionText: { fontSize: 12, fontWeight: '600' },
  newCategoryRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  newCategoryInput: { flex: 1, minHeight: 46, borderRadius: 14, paddingHorizontal: 13, fontSize: 13 },
  addCategoryButton: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  errorBox: { borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18 },
  submit: { minHeight: 55, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  deleteButton: { minHeight: 50, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteText: { fontSize: 14, fontWeight: '700', color: '#FF9D9D' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  centerText: { fontSize: 15 },
  centerTitle: { fontSize: 20, fontWeight: '700' },
  centerButton: { borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12, marginTop: 5 },
  centerButtonText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
    productImagePreview: {
    width: '100%',
    height: 180,
    borderRadius: 14,
  },
  productImagePlaceholder: {
    height: 150,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  imageActionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imageActionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catalogOption: {
    width: '30%',
    minHeight: 105,
    borderRadius: 12,
    padding: 7,
    alignItems: 'center',
    gap: 5,
  },
  catalogImage: {
    width: '100%',
    height: 65,
  },
  catalogImageName: {
    fontSize: 11,
    textAlign: 'center',
  },
});