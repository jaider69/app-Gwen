import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import colors from '@/constants/colors';
import { useAuth } from '@/src/presentation/context/AuthContext';

const G = colors.brand;
const SURFACE = colors.light;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, signOut } = useAuth();

  async function logout() {
    await signOut();
    router.replace('/auth/welcome');
  }

  return (
    <AppBackground>
      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <Link href="/dashboard" asChild>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver al dashboard" style={[styles.back, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
              <Feather name="arrow-left" size={20} color={G.onGradientText} />
            </Pressable>
          </Link>
          <Text style={[styles.headerTitle, { color: G.onGradientText }]}>Mi perfil</Text>
          <View style={styles.spacer} />
        </View>

        <View style={[styles.avatar, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
          <Feather name="user" size={30} color={G.onGradientText} />
        </View>
        <View style={styles.heading}>
          <Text style={[styles.name, { color: G.onGradientText }]}>{session?.displayName ?? 'Usuario'}</Text>
          <Text style={[styles.email, { color: G.onGradientTextMuted }]}>{session?.email ?? 'Correo no disponible'}</Text>
        </View>

        <View style={[styles.infoCard, { backgroundColor: SURFACE.card }]}>
          <InfoRow label="ID de usuario" value={session?.userId ?? 'No disponible'} />
          <View style={[styles.divider, { backgroundColor: SURFACE.border }]} />
          <InfoRow label="ID de tienda" value={session?.storeId ?? 'Pendiente de perfil'} />
        </View>

        <Text style={[styles.note, { color: G.onGradientTextMuted }]}>
          Estos datos provienen de la sesión guardada localmente. El nombre de la tienda se consultará con Row Level Security cuando Supabase esté configurado.
        </Text>

        <Pressable onPress={logout} accessibilityRole="button" accessibilityLabel="Cerrar sesión" style={({ pressed }) => [styles.logout, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.7 : 1 }]}>
          <Feather name="log-out" size={18} color="#FF9D9D" />
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </AppBackground>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: SURFACE.mutedForeground }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.infoValue, { color: SURFACE.cardForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  spacer: { width: 44 },
  avatar: { width: 76, height: 76, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 16 },
  heading: { alignItems: 'center', gap: 4 },
  name: { fontSize: 24, fontWeight: '700' },
  email: { fontSize: 14 },
  infoCard: { borderRadius: 18, padding: 16, gap: 14 },
  infoRow: { gap: 5 },
  infoLabel: { fontSize: 12, fontWeight: '600' },
  infoValue: { fontSize: 14 },
  divider: { height: 1 },
  note: { fontSize: 13, lineHeight: 19 },
  logout: { minHeight: 52, borderRadius: 17, borderWidth: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', marginTop: 'auto' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#FF9D9D' },
});