import { LocalJsonStore } from '@/src/data/local/localJsonStore';
import { isSupabaseConfigured } from '@/src/services/config/environment';
import seedData from '@/src/data/seed/seed-data.json';

/**
 * Debe coincidir exactamente con STORAGE_NAMESPACE en:
 * src/data/local/localJsonStore.ts
 *
 * LocalJsonStore antepone este prefijo internamente en cada get/set/remove,
 * así que aquí debemos quitarlo de las claves del seed antes de guardarlas,
 * o terminaríamos con un namespace duplicado.
 */
const STORAGE_NAMESPACE = '@gwen-inventario';

/**
 * Clave de control (no es una tabla de negocio, por eso no vive en LOCAL_TABLES).
 * Se guarda también vía LocalJsonStore, así que en AsyncStorage aparecerá como
 * `${STORAGE_NAMESPACE}/seed-initialized`.
 */
const SEED_INITIALIZED_KEY = 'seed-initialized';

function stripNamespace(fullKey: string): string {
  const prefix = `${STORAGE_NAMESPACE}/`;
  return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
}

/**
 * Carga seed-data.json en AsyncStorage (vía LocalJsonStore) la primera vez
 * que la app corre en modo desarrollo/demo (sin Supabase configurado).
 *
 * Es seguro llamarla en cada arranque de la app:
 * - Si Supabase está configurado -> no hace nada.
 * - Si el seed ya fue cargado antes -> no hace nada (no sobrescribe datos).
 * - Solo en la primera ejecución sin Supabase -> escribe todas las claves.
 */
export async function loadSeedIfNeeded(): Promise<void> {
  if (isSupabaseConfigured()) {
    return;
  }

  const storage = new LocalJsonStore();

  const alreadyInitialized = await storage.get<boolean>(SEED_INITIALIZED_KEY);
  if (alreadyInitialized) {
    return;
  }

  const entries = Object.entries(seedData as Record<string, unknown>);
  for (const [fullKey, value] of entries) {
    const key = stripNamespace(fullKey);
    await storage.set(key, value);
  }

  await storage.set(SEED_INITIALIZED_KEY, true);
}