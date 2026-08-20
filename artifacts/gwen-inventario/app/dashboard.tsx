import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
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

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();
  const { products, movements, sales, loading, pendingCount } = useProducts();
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Gwen Inventario</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Bienvenido</Text>
            <Text style={[styles.storeName, { color: colors.mutedForeground }]}>{session?.storeName ?? 'Tu tienda'}</Text>
          </View>
          <Link href="/profile" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" style={[styles.profileButton, { backgroundColor: colors.secondary }]}>
              <Feather name="user" size={20} color={colors.primary} />
            </Pressable>
          </Link>
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroTopline}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primaryForeground }]}>
              <Feather name="package" size={19} color={colors.primary} />
            </View>
            <View style={[styles.syncPill, { backgroundColor: colors.primaryForeground }]}>
              <View style={[styles.syncDot, { backgroundColor: pendingCount > 0 ? colors.destructive : colors.primary }]} />
              <Text style={[styles.syncText, { color: colors.primary }]}>
                {pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}` : 'Sincronizado'}
              </Text>
            </View>
          </View>
          <Text style={[styles.heroTitle, { color: colors.primaryForeground }]}>Tu inventario, bajo control</Text>
          <Text style={[styles.heroText, { color: colors.secondaryForeground }]}>
            Registra cada producto de tu tienda y recibe alertas antes de que falte o venza.
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          <MetricCard label="Productos" value={loading ? '—' : String(products.length)} icon="package" colors={colors} />
          <MetricCard label="Stock bajo" value={String(lowStockCount)} icon="trending-down" tone="warning" colors={colors} />
          <MetricCard label="Agotados" value={String(outOfStockCount)} icon="slash" tone="danger" colors={colors} />
          <MetricCard label="Por vencer" value={String(expiringCount)} icon="clock" tone="warning" colors={colors} />
          <MetricCard label="Ventas del día" value={formatCurrency(salesToday)} icon="shopping-bag" colors={colors} />
        </View>

        <AlertsSection
          alerts={alerts}
          colors={colors}
          notificationPermission={notificationPermission}
          onEnableNotifications={enableNotifications}
          onOpenInventory={() => router.push('/products')}
        />

        <View style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statusIcon, { backgroundColor: colors.secondary }]}>
            <Feather name="box" size={19} color={colors.primary} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={[styles.statusTitle, { color: colors.cardForeground }]}>Catálogo completo</Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {session?.storeId ? 'Todos los productos pertenecen únicamente a tu tienda.' : 'Completa el perfil de tu tienda para comenzar.'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver inventario"
            onPress={() => router.push('/products')}
            style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}
          >
            <Feather name="list" size={18} color={colors.primaryForeground} />
            <Text style={[styles.primaryActionText, { color: colors.primaryForeground }]}>Ver inventario</Text>
            <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar producto"
            onPress={() => router.push('/products/new')}
            style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="plus" size={18} color={colors.primary} />
            <Text style={[styles.secondaryActionText, { color: colors.primary }]}>Agregar producto</Text>
          </Pressable>
          <View style={styles.quickRow}>
            <QuickAction label="Entrada" icon="arrow-down-left" onPress={() => router.push('/entries/new')} colors={colors} />
            <QuickAction label="Venta" icon="shopping-bag" onPress={() => router.push('/sales/new')} colors={colors} />
            <QuickAction label="Movimientos" icon="activity" onPress={() => router.push('/movements')} colors={colors} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          onPress={logout}
          style={({ pressed }) => [styles.logout, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'normal',
  colors,
}: {
  label: string;
  value: string;
  icon: ComponentProps<typeof Feather>['name'];
  tone?: 'normal' | 'warning' | 'danger';
  colors: ReturnType<typeof useColors>;
}) {
  const iconColor = tone === 'danger' ? colors.destructive : tone === 'warning' ? '#B7791F' : colors.primary;
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.metricIcon, { backgroundColor: tone === 'danger' ? '#FCEBEB' : tone === 'warning' ? '#FFF5D6' : colors.secondary }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[styles.metricValue, { color: colors.cardForeground }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function AlertsSection({
  alerts,
  colors,
  notificationPermission,
  onEnableNotifications,
  onOpenInventory,
}: {
  alerts: InventoryAlert[];
  colors: ReturnType<typeof useColors>;
  notificationPermission: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  onEnableNotifications: () => Promise<void>;
  onOpenInventory: () => void;
}) {
  const visibleAlerts = alerts.slice(0, 4);
  return (
    <View style={styles.alertSection}>
      <View style={styles.sectionHeading}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Alertas</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>
            {alerts.length === 0 ? 'Todo está en orden' : `${alerts.length} aviso${alerts.length === 1 ? '' : 's'} para revisar`}
          </Text>
        </View>
        <Feather name={alerts.length > 0 ? 'alert-circle' : 'check-circle'} size={21} color={alerts.length > 0 ? colors.destructive : colors.primary} />
      </View>
      {visibleAlerts.length === 0 ? (
        <View style={[styles.clearAlert, { backgroundColor: colors.secondary }]}>
          <Feather name="check" size={18} color={colors.primary} />
          <Text style={[styles.clearAlertText, { color: colors.cardForeground }]}>No hay productos con stock crítico o vencimiento cercano.</Text>
        </View>
      ) : (
        <View style={styles.alertList}>
          {visibleAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} colors={colors} />)}
          {alerts.length > visibleAlerts.length ? (
            <Pressable onPress={onOpenInventory} style={[styles.moreAlerts, { borderColor: colors.border }]}>
              <Text style={[styles.moreAlertsText, { color: colors.primary }]}>Ver {alerts.length - visibleAlerts.length} alertas más</Text>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      )}
      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Activar notificaciones de inventario"
          onPress={() => void onEnableNotifications()}
          style={({ pressed }) => [styles.notificationButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="bell" size={17} color={colors.primary} />
          <Text style={[styles.notificationText, { color: colors.primary }]}>
            {notificationPermission === 'denied' ? 'Permite avisos desde los ajustes del dispositivo' : 'Activar avisos en este dispositivo'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function AlertRow({ alert, colors }: { alert: InventoryAlert; colors: ReturnType<typeof useColors> }) {
  const isExpired = alert.type === 'out-of-stock';
  const accent = isExpired ? colors.destructive : '#B7791F';
  const icon = alert.type === 'low-stock' ? 'trending-down' : alert.type === 'out-of-stock' ? 'slash' : 'clock';
  return (
    <View style={[styles.alertRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.alertIcon, { backgroundColor: isExpired ? '#FCEBEB' : '#FFF5D6' }]}>
        <Feather name={icon} size={17} color={accent} />
      </View>
      <View style={styles.alertCopy}>
        <Text style={[styles.alertTitle, { color: colors.cardForeground }]}>{alert.title}: {alert.productName}</Text>
        <Text style={[styles.alertMessage, { color: colors.mutedForeground }]}>{alert.message}</Text>
      </View>
    </View>
  );
}

function QuickAction({
  label,
  icon,
  onPress,
  colors,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Registrar ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.72 : 1 }]}
    >
      <Feather name={icon} size={17} color={colors.primary} />
      <Text style={[styles.quickActionText, { color: colors.cardForeground }]}>{label}</Text>
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
  profileButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroCard: { borderRadius: 24, padding: 20, gap: 10 },
  heroTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  syncPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 24, lineHeight: 29, fontWeight: '700' },
  heroText: { fontSize: 14, lineHeight: 21 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', minHeight: 102, borderWidth: 1, borderRadius: 18, padding: 13, gap: 5 },
  metricIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 22, fontWeight: '700' },
  metricLabel: { fontSize: 12, fontWeight: '600' },
  alertSection: { gap: 11 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  alertList: { gap: 8 },
  alertRow: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', gap: 10 },
  alertIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertCopy: { flex: 1, gap: 3 },
  alertTitle: { fontSize: 13, fontWeight: '700' },
  alertMessage: { fontSize: 12, lineHeight: 17 },
  clearAlert: { minHeight: 58, borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  clearAlertText: { flex: 1, fontSize: 13, lineHeight: 18 },
  moreAlerts: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moreAlertsText: { fontSize: 13, fontWeight: '700' },
  notificationButton: { minHeight: 46, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  notificationText: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  actionCard: { borderWidth: 1, borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, gap: 3 },
  statusTitle: { fontSize: 15, fontWeight: '700' },
  statusText: { fontSize: 13, lineHeight: 18 },
  actions: { gap: 10 },
  primaryAction: { minHeight: 54, borderRadius: 17, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryActionText: { flex: 1, fontSize: 15, fontWeight: '700' },
  secondaryAction: { minHeight: 52, borderRadius: 17, borderWidth: 1, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryActionText: { fontSize: 15, fontWeight: '700' },
  quickRow: { flexDirection: 'row', gap: 8 },
  quickAction: { flex: 1, minHeight: 62, borderWidth: 1, borderRadius: 16, padding: 10, gap: 7, justifyContent: 'center' },
  quickActionText: { fontSize: 11, fontWeight: '700' },
  logout: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  logoutText: { fontSize: 15, fontWeight: '700' },
});