import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_NAMESPACE = '@gwen-inventario';

function namespacedKey(key: string): string {
  return `${STORAGE_NAMESPACE}/${key}`;
}

export class LocalJsonStore {
  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(namespacedKey(key));
    return value ? (JSON.parse(value) as T) : null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(namespacedKey(key), JSON.stringify(value));
  }

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(namespacedKey(key));
  }
}