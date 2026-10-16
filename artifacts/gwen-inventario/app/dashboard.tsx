import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import rawColors from '@/constants/colors';
import { useAuth } from '@/src/presentation/context/AuthContext';
import { useProducts } from '@/src/presentation/context/ProductContext';
import {
  getInventoryAlerts,
  getLocalNotificationPermission,
  requestLocalNotificationPermission,
  scheduleInventoryNotifications,
  type InventoryAlert,
} from '@/src/services/alerts/notificationService';
import { getProductHealth } from '@/src/services/products/productService';

// Carga de imágenes locales usando 2 niveles hacia atrás (../../)
// @ts-ignore
const heroIconSource = require('../assets/images/Cajas.png');
const paqueteIconSource = require('../assets/images/Paquete.png');
const disminucionIconSource = require('../assets/images/disminucion.png');
const agotadoIconSource = require('../assets/images/agotado.png');
const porvencerIconSource = require('../assets/images/porvencer.png');
const alertaIconSource = require('../assets/images/alerta.png');
const monedasIconSource = require('../assets/images/monedas.png');
const usuarioIconSource = require('../assets/images/usuario.png');

// Texto/elementos que flotan directamente sobre el degradado de fondo.
const HERO = {
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.82)',
  glassBg: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.32)',
  pillBg: '#FFFFFF',
  pillText: '#16283D',
};

// Tarjetas sólidas (siempre blancas, para máxima legibilidad sobre el degradado).
const SURFACE = {
  card: '#FFFFFF',
  cardForeground: '#16283D',
  mutedForeground: '#5B7184',
  border: '#E4EAF0',
  secondary: '#EAF2F8',
  destructive: '#C94C4C',
  primary: '#1F5C8C',
  primaryForeground: '#FFFFFF',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { products, sales, loading, pendingCount } = useProducts();
  const lowStockCount = products.filter((product) => getProductHealth(product).lowStock).length;
  const expiringCount = products.filter((product) => getProductHealth(product).expiring).length;
  const outOfStockCount = products.filter((product) => getProductHealth(product).outOfStock).length;
  const today = new Date().toISOString().slice(0, 10);
  const salesToday = sales
    .filter((sale) => sale.status === 'completed' && sale.soldAt.slice(0, 10) === today)
    .reduce((total, sale) => total + sale.total, 0);
  const alerts = useMemo(() => getInventoryAlerts(products), [products]);
  const [notificationPermission, setNotificationPermission] = useState<'granted' | 'denied' | 'undetermined' | 'unsupported'>('undetermined');

  useEffect(() => {
    void getLocalNotificationPermission().then(setNotificationPermission);
  }, []);

  useEffect(() => {
    if (session?.storeId) void scheduleInventoryNotifications(session.storeId, products);
  }, [products, session?.storeId]);

  async function enableNotifications() {
    const permission = await requestLocalNotificationPermission();
    setNotificationPermission(permission);
    if (permission === 'granted' && session?.storeId) {
      await scheduleInventoryNotifications(session.storeId, products);
    }
  }

  async function logout() {
    await signOut();
    router.replace('/auth/welcome');
  }

  return (
    <LinearGradient
      colors={rawColors.brand.gradient}
      locations={rawColors.brand.gradientLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: HERO.textMuted }]}>Gwen Inventario</Text>
            <Text style={[styles.title, { color: HERO.text }]}>Bienvenido</Text>
            <Text style={[styles.storeName, { color: HERO.textMuted }]}>{session?.storeName ?? 'Tu tienda'}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil"
          >
            <Image source={usuarioIconSource} style={{ width: 28, height: 28, resizeMode: 'contain' }} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroTopline}>
            <View style={styles.heroIcon}>
              <Image 
                source={heroIconSource} 
                style={styles.heroImage} 
              />
            </View>
            <View style={[styles.syncPill, { backgroundColor: HERO.pillBg }]}>
              <View style={[styles.syncDot, { backgroundColor: pendingCount > 0 ? SURFACE.destructive : SURFACE.primary }]} />
              <Text style={[styles.syncText, { color: HERO.pillText }]}>
                {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Sincronizado'}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: HERO.text }]}>Tu inventario, bajo control</Text>
          <Text style={[styles.heroText, { color: HERO.textMuted }]}>
            Registra cada producto de tu tienda y recibe alertas antes de que falte o venza.
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard 
            label="Productos" 
            value={loading ? '—' : String(products.length)} 
            imageSource={paqueteIconSource}
            onPress={() => router.push('/products')} 
          />
          <MetricCard label="Stock bajo" value={String(lowStockCount)} imageSource={disminucionIconSource} tone="warning" onPress={() => router.push('/products?filter=low-stock')} />
          <MetricCard label="Agotados" value={String(outOfStockCount)} imageSource={agotadoIconSource} tone="danger" onPress={() => router.push('/products?filter=out-of-stock')} />
          <MetricCard label="Por vencer" value={String(expiringCount)} imageSource={porvencerIconSource} tone="warning" onPress={() => router.push('/products?filter=expiring')} />
          <MetricCard label="Ventas del día" value={formatCurrency(salesToday)} imageSource={monedasIconSource} onPress={() => router.push('/movements?filter=sale')} />
        </View>

        <View style={styles.alertSection}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: HERO.text }]}>Alertas</Text>
              <Text style={[styles.sectionSubtitle, { color: HERO.textMuted }]}>
                {alerts.length === 0 ? 'Todo está en orden' : `${alerts.length} aviso${alerts.length === 1 ? '' : 's'} para revisar`}
              </Text>
            </View>
            <Image source={alertaIconSource} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
          </View>

          {alerts.length === 0 ? (
            <View style={[styles.clearAlert, { backgroundColor: SURFACE.card }]}>
              <Feather name="check" size={18} color={SURFACE.primary} />
              <Text style={[styles.clearAlertText, { color: SURFACE.cardForeground }]}>No hay productos con stock crítico o vencimiento cercano.</Text>
            </View>
          ) : (
            <View style={styles.alertList}>
              {alerts.slice(0, 4).map((alert) => <AlertRow key={alert.id} alert={alert} />)}
              {alerts.length > 4 ? (
                <Pressable onPress={() => router.push('/products')} style={[styles.moreAlerts, { backgroundColor: SURFACE.card }]}>
                  <Text style={[styles.moreAlertsText, { color: SURFACE.primary }]}>Ver {alerts.length - 4} alertas más</Text>
                  <Feather name="arrow-right" size={16} color={SURFACE.primary} />
                </Pressable>
              ) : null}
            </View>
          )}

          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Activar notificaciones de inventario"
              onPress={() => void enableNotifications()}
              style={({ pressed }) => [styles.notificationButton, { backgroundColor: HERO.glassBg, borderColor: HERO.glassBorder, opacity: pressed ? 0.75 : 1 }]}
            >
              <Feather name="bell" size={17} color={HERO.text} />
              <Text style={[styles.notificationText, { color: HERO.text }]}>
                {notificationPermission === 'denied' ? 'Permite avisos desde los ajustes del dispositivo' : 'Activar avisos en este dispositivo'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver inventario"
            onPress={() => router.push('/products')}
            style={({ pressed }) => [styles.primaryAction, { backgroundColor: SURFACE.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="list" size={18} color={SURFACE.primaryForeground} />
            <Text style={[styles.primaryActionText, { color: SURFACE.primaryForeground }]}>Ver inventario</Text>
            <Feather name="arrow-right" size={18} color={SURFACE.primaryForeground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar producto"
            onPress={() => router.push('/products/new')}
            style={({ pressed }) => [styles.secondaryAction, { backgroundColor: HERO.glassBg, borderColor: HERO.glassBorder, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="plus" size={18} color={HERO.text} />
            <Text style={[styles.secondaryActionText, { color: HERO.text }]}>Agregar producto</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Hablar con Gwen"
            onPress={() => router.push('/gwen')}
            style={({ pressed }) => [styles.gwenAction, { backgroundColor: HERO.glassBg, borderColor: HERO.glassBorder, opacity: pressed ? 0.75 : 1 }]}
          >
            <Feather name="mic" size={18} color={HERO.text} />
            <Text style={[styles.secondaryActionText, { color: HERO.text }]}>Hablar con Gwen</Text>
          </Pressable>
          <View style={styles.quickRow}>
            <QuickAction
              label="Entrada"
              icon="arrow-down-left"
              onPress={() => router.push('/entries/new')}
            />

            <QuickAction
              label="Venta"
              icon="shopping-bag"
              onPress={() => router.push('/sales/new')}
            />

            <QuickAction
              label="Movimientos"
              icon="activity"
              onPress={() => router.push('/movements')}
            />

            <QuickAction
              label="Informe"
              icon="bar-chart-2"
              onPress={() => router.push('/informes')}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          onPress={logout}
          style={({ pressed }) => [styles.logout, { backgroundColor: HERO.glassBg, borderColor: HERO.glassBorder, opacity: pressed ? 0.75 : 1 }]}
        >
          <Feather name="log-out" size={18} color={HERO.text} />
          <Text style={[styles.logoutText, { color: HERO.text }]}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

function MetricCard({
  label,
  value,
  icon,
  imageSource,
  tone = 'normal',
  onPress,
}: {
  label: string;
  value: string;
  icon?: ComponentProps<typeof Feather>['name'];
  imageSource?: any;
  tone?: 'normal' | 'warning' | 'danger';
  onPress?: () => void;
}) {
  const iconColor = tone === 'danger' ? SURFACE.destructive : tone === 'warning' ? '#B7791F' : SURFACE.primary;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Ver ${label.toLowerCase()}` : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.metricCard, { backgroundColor: SURFACE.card, opacity: pressed && onPress ? 0.85 : 1 }]}
    >
      <View style={[styles.metricIcon, { backgroundColor: tone === 'danger' ? '#FCEBEB' : tone === 'warning' ? '#FFF5D6' : SURFACE.secondary }]}>
        {imageSource ? (
          <Image source={imageSource} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
        ) : (
          icon && <Feather name={icon} size={16} color={iconColor} />
        )}
      </View>
      <Text style={[styles.metricValue, { color: SURFACE.cardForeground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: SURFACE.mutedForeground }]}>{label}</Text>
    </Pressable>
  );
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('es-CO')}`;
}

function AlertRow({ alert }: { alert: InventoryAlert }) {
  const router = useRouter();
  const isExpired = alert.type === 'out-of-stock';
  const accent = isExpired ? SURFACE.destructive : '#B7791F';

  // Determinamos a qué ruta redirigir según el tipo de alerta
  const handlePress = () => {
    if (alert.type === 'low-stock') {
      router.push('/products?filter=low-stock');
    } else if (alert.type === 'out-of-stock') {
      router.push('/products?filter=out-of-stock');
    } else if (alert.type === 'expiring') {
      router.push('/products?filter=expiring');
    } else {
      router.push('/products');
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.alertRow, 
        { backgroundColor: SURFACE.card, opacity: pressed ? 0.85 : 1 }
      ]}
    >
      <View style={[styles.alertIcon, { backgroundColor: isExpired ? '#FCEBEB' : '#FFF5D6' }]}>
        <Image source={disminucionIconSource} style={{ width: 18, height: 18, resizeMode: 'contain' }} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={[styles.alertTitle, { color: SURFACE.cardForeground }]}>{alert.title}: {alert.productName}</Text>
        <Text style={[styles.alertMessage, { color: SURFACE.mutedForeground }]}>{alert.message}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={SURFACE.mutedForeground} style={{ alignSelf: 'center' }} />
    </Pressable>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Registrar ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: SURFACE.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <Feather name={icon} size={17} color={SURFACE.primary} />
      <Text style={[styles.quickActionText, { color: SURFACE.cardForeground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  storeName: { fontSize: 14, fontWeight: '600', marginTop: 3 },
  profileButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingVertical: 6, gap: 10 },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: 38, height: 38, resizeMode: 'contain' },
  syncPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 26, lineHeight: 31, fontWeight: '700' },
  heroText: { fontSize: 14, lineHeight: 21 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', minHeight: 102, borderRadius: 18, padding: 13, gap: 5 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  alertSection: { gap: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  alertList: { gap: 8 },
  alertRow: { borderRadius: 17, padding: 12, flexDirection: 'row', gap: 10 },
  alertIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertCopy: { flex: 1, gap: 3 },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertMessage: { fontSize: 12, lineHeight: 17 },
  clearAlert: { minHeight: 58, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  clearAlertText: { flex: 1, fontSize: 13, lineHeight: 18 },
  moreAlerts: { minHeight: 44, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreAlertsText: { fontSize: 13, fontWeight: '700' },
  notificationButton: { minHeight: 46, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notificationText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  actions: { gap: 10 },
  primaryAction: { minHeight: 54, borderRadius: 17, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryActionText: { flex: 1, fontSize: 15, fontWeight: '700' },
  secondaryAction: { minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryActionText: { fontSize: 15, fontWeight: '700' },
  gwenAction: { minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickAction: { flex: 1, minHeight: 62, borderRadius: 16, padding: 8, gap: 7, justifyContent: 'center' },
  quickActionText: { fontSize: 10, fontWeight: '700' },
  logout: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  logoutText: { fontSize: 15, fontWeight: '700' },
});