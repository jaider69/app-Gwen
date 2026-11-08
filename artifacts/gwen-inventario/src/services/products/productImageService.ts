import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '@/src/data/supabase/supabaseClient';

const STORAGE_BUCKET = 'product-images';

export type ProductCatalogImage = {
  id: string;
  name: string;
  url: string;
};

export type StoreProductImage = {
  storeId: string;
  productId: string;
  imageId: string | null;
  storagePath: string | null;
  url: string;
};

export type PickedImage = {
  uri: string;
  mimeType: string | null;
};

type CatalogImageRow = {
  id_imagen: string;
  nombre: string;
  ruta_storage: string;
  url_publica: string;
};

type StoreImageRow = {
  id_tienda: string;
  id_producto: string;
  id_imagen: string | null;
  ruta_storage: string | null;
  url_publica: string | null;
};

function requireValue(value: string | null | undefined, message: string): string {
  if (!value?.trim()) {
    throw new Error(message);
  }

  return value.trim();
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`No fue posible verificar la sesión: ${error.message}`);
  }

  if (!user) {
    throw new Error('Debes iniciar sesión para gestionar imágenes.');
  }

  return user.id;
}

/**
 * Verifica que el producto exista en el catálogo remoto antes
 * de permitir guardar una asignación de imagen.
 */
async function verifyRemoteProduct(productId: string): Promise<void> {
  const { data, error } = await supabase
    .from('productos')
    .select('id_producto')
    .eq('id_producto', productId)
    .eq('activo', true)
    .maybeSingle();

  if (error) {
    throw new Error(`No fue posible verificar el producto: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      'Este producto todavía no existe en el catálogo de Supabase. Guarda el producto en la nube antes de asignarle una imagen.',
    );
  }
}

/**
 * Permite comprobar desde el formulario si el producto ya existe
 * en Supabase antes de intentar guardar una imagen.
 */
export async function isRemoteProductAvailable(
  productId: string,
): Promise<boolean> {
  try {
    await verifyRemoteProduct(productId);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(
        'Este producto todavía no existe en el catálogo de Supabase.',
      )
    ) {
      return false;
    }

    throw error;
  }
}

/**
 * Consulta las imágenes activas del catálogo compartido.
 * Las tiendas pueden seleccionar estas imágenes, pero este
 * servicio no permite incorporarlas al catálogo.
 */
export async function listSharedProductImages(): Promise<ProductCatalogImage[]> {
  const { data, error } = await supabase
    .from('catalogo_imagenes')
    .select('id_imagen,nombre,ruta_storage,url_publica')
    .eq('activa', true)
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(`No fue posible consultar el catálogo de imágenes: ${error.message}`);
  }

  return ((data ?? []) as CatalogImageRow[]).map((row) => ({
    id: row.id_imagen,
    name: row.nombre,
    url: row.url_publica,
  }));
}

/**
 * Consulta las imágenes asignadas exclusivamente a una tienda.
 */
export async function listStoreProductImages(
  storeId: string,
): Promise<StoreProductImage[]> {
  const resolvedStoreId = requireValue(
    storeId,
    'No se encontró la tienda de la sesión.',
  );

  const { data, error } = await supabase
    .from('imagenes_producto_tienda')
    .select('id_tienda,id_producto,id_imagen,ruta_storage,url_publica')
    .eq('id_tienda', resolvedStoreId);

  if (error) {
    throw new Error(`No fue posible consultar las imágenes de la tienda: ${error.message}`);
  }

  return ((data ?? []) as StoreImageRow[])
    .filter((row) => Boolean(row.url_publica))
    .map((row) => ({
      storeId: row.id_tienda,
      productId: row.id_producto,
      imageId: row.id_imagen,
      storagePath: row.ruta_storage,
      url: row.url_publica as string,
    }));
}

/**
 * Guarda o reemplaza la imagen de un producto para una tienda.
 * No crea registros locales ni incorpora imágenes al catálogo común.
 */
async function saveStoreProductImage(
  storeId: string,
  productId: string,
  image: {
    imageId?: string | null;
    storagePath?: string | null;
    publicUrl: string;
  },
  authenticatedUserId?: string,
  productAlreadyVerified = false,
): Promise<void> {
  const resolvedStoreId = requireValue(
    storeId,
    'No se encontró la tienda de la sesión.',
  );
  const resolvedProductId = requireValue(
    productId,
    'No se encontró el producto seleccionado.',
  );
  const authStartedAt = Date.now();
  const userId = authenticatedUserId ?? (await getAuthenticatedUserId());

  console.log(
    `[Gwen][Tiempo Imagen] Verificación usuario: ${
      authenticatedUserId ? 0 : Date.now() - authStartedAt
    } ms`,
  );

  if (!productAlreadyVerified) {
    const productCheckStartedAt = Date.now();
    await verifyRemoteProduct(resolvedProductId);

    console.log(
      `[Gwen][Tiempo Imagen] Verificación producto: ${
        Date.now() - productCheckStartedAt
      } ms`,
    );
  }

  const imageSaveStartedAt = Date.now();
  const { error } = await supabase
    .from('imagenes_producto_tienda')
    .upsert(
      {
        id_tienda: resolvedStoreId,
        id_producto: resolvedProductId,
        id_imagen: image.imageId ?? null,
        ruta_storage: image.storagePath ?? null,
        url_publica: image.publicUrl,
        actualizado_por: userId,
        actualizada_en: new Date().toISOString(),
      },
      {
        onConflict: 'id_tienda,id_producto',
      },
    );

    console.log(
      `[Gwen][Tiempo Imagen] Guardado upsert: ${Date.now() - imageSaveStartedAt} ms`,
    );

  if (error) {
    throw new Error(`No fue posible guardar la imagen del producto: ${error.message}`);
  }
}

/**
 * Asigna al producto una imagen del catálogo compartido.
 */
export async function assignSharedProductImage(
  storeId: string,
  productId: string,
  imageId: string,
  productAlreadyVerified = false,
): Promise<void> {
  const resolvedImageId = requireValue(
    imageId,
    'Selecciona una imagen del catálogo.',
  );

  const catalogQueryStartedAt = Date.now();
  const { data, error } = await supabase
    .from('catalogo_imagenes')
    .select('id_imagen,ruta_storage,url_publica')
    .eq('id_imagen', resolvedImageId)
    .eq('activa', true)
    .maybeSingle();
    console.log(
      `[Gwen][Tiempo Imagen] Consulta catálogo: ${Date.now() - catalogQueryStartedAt} ms`,
    );

  if (error) {
    throw new Error(`No fue posible consultar la imagen seleccionada: ${error.message}`);
  }

  if (!data) {
    throw new Error('La imagen seleccionada no existe o ya no está disponible.');
  }

  await saveStoreProductImage(
    storeId,
    productId,
    {
      imageId: data.id_imagen,
      storagePath: data.ruta_storage,
      publicUrl: data.url_publica,
    },
    undefined,
    productAlreadyVerified,
  );
}

/**
 * Abre la galería del dispositivo.
 * Devuelve también el mimeType reportado por el propio selector,
 * que es la fuente fiable para determinar el tipo de archivo
 * (no se puede confiar en Blob.type en React Native).
 */
export async function pickProductImageFromGallery(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Debes permitir el acceso a la galería para elegir una imagen.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  return { uri: asset.uri, mimeType: asset.mimeType ?? null };
}

/**
 * Abre la cámara del dispositivo.
 * Devuelve también el mimeType reportado por el propio selector.
 */
export async function takeProductImageWithCamera(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Debes permitir el acceso a la cámara para tomar una foto.');
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  return { uri: asset.uri, mimeType: asset.mimeType ?? null };
}

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function inferMimeTypeFromUri(uri: string): string | null {
  const withoutQuery = uri.split('?')[0] ?? uri;
  const extension = withoutQuery.split('.').pop()?.toLowerCase();
  if (!extension) return null;
  return EXTENSION_TO_MIME[extension] ?? null;
}

/**
 * Decodifica una cadena Base64 a bytes sin depender de `atob`
 * (no disponible de forma garantizada en todos los motores de
 * React Native) ni de ninguna dependencia externa nueva.
 */
function decodeBase64ToBytes(base64: string): Uint8Array {
  const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Int16Array(256).fill(-1);
  for (let i = 0; i < BASE64_CHARS.length; i += 1) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }

  const cleaned = base64.replace(/[^A-Za-z0-9+/=]/g, '');
  let outputLength = (cleaned.length / 4) * 3;
  if (cleaned.endsWith('==')) outputLength -= 2;
  else if (cleaned.endsWith('=')) outputLength -= 1;

  const bytes = new Uint8Array(outputLength);
  let p = 0;

  for (let i = 0; i < cleaned.length; i += 4) {
    const c1 = lookup[cleaned.charCodeAt(i)];
    const c2 = lookup[cleaned.charCodeAt(i + 1)];
    const c3 = cleaned[i + 2] === '=' ? -1 : lookup[cleaned.charCodeAt(i + 2)];
    const c4 = cleaned[i + 3] === '=' ? -1 : lookup[cleaned.charCodeAt(i + 3)];

    bytes[p] = (c1 << 2) | (c2 >> 4);
    p += 1;
    if (c3 !== -1) {
      bytes[p] = ((c2 & 15) << 4) | (c3 >> 2);
      p += 1;
    }
    if (c4 !== -1) {
      bytes[p] = ((c3 & 3) << 6) | c4;
      p += 1;
    }
  }

  return bytes;
}

/**
 * Sube una fotografía propia de la tienda y la asigna al producto.
 * Cada archivo tiene una ruta única; no sobrescribe archivos existentes.
 *
 * IMPORTANTE: ya no usa fetch(imageUri) + response.blob(), porque ese
 * patrón es conocido por fallar de forma intermitente en React Native
 * (Blob.type suele venir vacío y la subida del Blob puede fallar con
 * "Network request failed" sin que el problema sea realmente de red).
 * En su lugar, se lee el archivo como Base64 con expo-file-system y se
 * sube como ArrayBufferView, que es el enfoque documentado por Supabase
 * para React Native.
 */
export async function uploadStoreProductImage(
  storeId: string,
  productId: string,
  imageUri: string,
  mimeTypeHint?: string | null,
): Promise<StoreProductImage> {
  const resolvedStoreId = requireValue(
    storeId,
    'No se encontró la tienda de la sesión.',
  );
  const resolvedProductId = requireValue(
    productId,
    'No se encontró el producto seleccionado.',
  );
  const resolvedImageUri = requireValue(
    imageUri,
    'No se seleccionó ninguna imagen.',
  );

  const userId = await getAuthenticatedUserId();

  await verifyRemoteProduct(resolvedProductId);

  const info = await FileSystem.getInfoAsync(resolvedImageUri);

  if (!info.exists) {
    throw new Error('No fue posible leer la imagen seleccionada en el dispositivo.');
  }

  if (typeof info.size === 'number') {
    if (info.size <= 0) {
      throw new Error('La imagen seleccionada está vacía.');
    }

    if (info.size > 5 * 1024 * 1024) {
      throw new Error('La imagen supera el límite de 5 MB permitido por Supabase.');
    }
  }

  const contentType = (mimeTypeHint ?? inferMimeTypeFromUri(resolvedImageUri) ?? '').toLowerCase();
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      'Formato de imagen no compatible. Usa una imagen JPEG, PNG o WebP.',
    );
  }

  const base64 = await FileSystem.readAsStringAsync(resolvedImageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const fileBytes = decodeBase64ToBytes(base64);

  if (fileBytes.byteLength <= 0) {
    throw new Error('La imagen seleccionada está vacía.');
  }

  if (fileBytes.byteLength > 5 * 1024 * 1024) {
    throw new Error('La imagen supera el límite de 5 MB permitido por Supabase.');
  }

  const extensionByType: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extensionByType[contentType]}`;
  const storagePath = `stores/${resolvedStoreId}/${resolvedProductId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBytes, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`No fue posible subir la imagen a Supabase: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = publicUrlData.publicUrl;

  try {
    await saveStoreProductImage(resolvedStoreId, resolvedProductId, {
      storagePath,
      publicUrl,
    });
  } catch (error) {
    // Si falla el registro en la base de datos, intenta evitar
    // dejar un archivo huérfano en Storage.
    const { error: cleanupError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (cleanupError) {
      throw new Error(
        `La imagen se subió, pero no se pudo guardar su asignación (${error instanceof Error ? error.message : 'error desconocido'}). No se pudo eliminar el archivo subido: ${cleanupError.message}`,
      );
    }

    throw error;
  }

  return {
    storeId: resolvedStoreId,
    productId: resolvedProductId,
    imageId: null,
    storagePath,
    url: publicUrl,
  };
}

/**
 * Quita la asignación de imagen del producto en la tienda.
 * No elimina archivos compartidos ni fotografías de Storage.
 */
export async function removeStoreProductImage(
  storeId: string,
  productId: string,
): Promise<void> {
  const resolvedStoreId = requireValue(
    storeId,
    'No se encontró la tienda de la sesión.',
  );
  const resolvedProductId = requireValue(
    productId,
    'No se encontró el producto seleccionado.',
  );

  await getAuthenticatedUserId();

  const { error } = await supabase
    .from('imagenes_producto_tienda')
    .delete()
    .eq('id_tienda', resolvedStoreId)
    .eq('id_producto', resolvedProductId);

  if (error) {
    throw new Error(`No fue posible quitar la imagen del producto: ${error.message}`);
  }
}