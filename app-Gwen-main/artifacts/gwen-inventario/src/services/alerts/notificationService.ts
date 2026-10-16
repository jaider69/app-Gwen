import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { LocalJsonStore } from '@/src/data/local/localJsonStore';
import type { Product } from '@/src/domain/models';
import { getProductHealth } from '@/src/services/products/productService';

export type InventoryAlertType = 'low-stock' | 'out-of-stock' | 'expiring';

export type InventoryAlert = {
  id: string;
  type: InventoryAlertType;
  productId: string;
  productName: string;
  title: string;
  message: string;
};

type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

const notificationStore = new LocalJsonStore();
const SENT_NOTIFICATIONS_KEY = 'inventory-notifications-sent';

export function getInventoryAlerts(products: Product[]): InventoryAlert[] {
  return products.flatMap((product) => {
    const health = getProductHealth(product);
    const alerts: InventoryAlert[] = [];
    if (health.outOfStock) {
      alerts.push({
        id: `out-of-stock:${product.id}`,
        type: 'out-of-stock',
        productId: product.id,
        productName: product.name,
        title: 'Producto agotado',
        message: `${product.name} se quedó sin unidades disponibles.`,
      });
    } else if (health.lowStock) {
      alerts.push({
        id: `low-stock:${product.id}`,
        type: 'low-stock',
        productId: product.id,
        productName: product.name,
        title: 'Stock bajo',
        message: `${product.name} tiene pocas unidades disponibles.`,
      });
    }
    if (health.expiring) {
      alerts.push({
        id: `expiring:${product.id}`,
        type: 'expiring',
        productId: product.id,
        productName: product.name,
        title: 'Próximo vencimiento',
        message: `${product.name} está próximo a vencer.`,
      });
    }
    return alerts;
  });
}

export async function getLocalNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.granted) return 'granted';
  if (permissions.status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function requestLocalNotificationPermission(): Promise<NotificationPermission> {
  if (Platform.OS === 'web') return 'unsupported';
  const permissions = await Notifications.requestPermissionsAsync();
  if (permissions.granted) return 'granted';
  if (permissions.status === Notifications.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function scheduleInventoryNotifications(
  storeId: string,
  products: Product[],
): Promise<void> {
  if (Platform.OS === 'web' || !storeId) return;
  const permission = await getLocalNotificationPermission();
  if (permission !== 'granted') return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('inventory-alerts', {
      name: 'Alertas de inventario',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const dayKey = new Date().toISOString().slice(0, 10);
  const sent = (await notificationStore.get<Record<string, boolean>>(SENT_NOTIFICATIONS_KEY)) ?? {};
  for (const alert of getInventoryAlerts(products)) {
    const notificationKey = `${storeId}:${dayKey}:${alert.id}`;
    if (sent[notificationKey]) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.message,
        data: { alertType: alert.type, productId: alert.productId },
      },
      trigger: null,
    });
    sent[notificationKey] = true;
  }
  await notificationStore.set(SENT_NOTIFICATIONS_KEY, sent);
}