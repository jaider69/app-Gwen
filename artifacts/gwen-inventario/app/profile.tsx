import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/src/presentation/context/AuthContext';

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();

  async function logout() {
    await signOut();
    router.replace('/auth/welcome');
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Link href="/dashboard" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver al dashboard" style={[styles.back, { backgroundColor: colors.secondary }]}>
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </Pressable>
          </Link>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mi perfil</Text>
          <View style={styles.spacer} />
        </View>

        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Feather name="user" size={30} color={colors.primaryForeground} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.name, { color: colors.foreground }]}>{session?.displayName ?? 'Usuario'}</Text>
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{session?.email ?? 'Correo no disponible'}</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <InfoRow label="ID de usuario" value={session?.userId ?? 'No disponible'} colors={colors} />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <InfoRow label="ID de tienda" value={session?.storeId ?? 'Pendiente de perfil'} colors={colors} />
        </View>

        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Estos datos provienen de la sesión guardada localmente. El nombre de la tienda se consultará con Row Level Security cuando Supabase esté configurado.
        </Text>

        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={({ pressed }) => [styles.logout, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive }]}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: colors.cardForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  spacer: { width: 44 },
  avatar: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
  heading: { alignItems: 'center', gap: 4 },
  name: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14 },
  infoCard: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  infoRow: { gap: 5 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 14 },
  divider: { height: 1 },
  note: { fontSize: 13, lineHeight: 19 },
  logout: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  logoutText: { fontSize: 15, fontWeight: '700' },
});