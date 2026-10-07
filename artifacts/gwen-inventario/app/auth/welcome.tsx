import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import colors from '@/constants/colors';
import { AuthNotice } from '@/src/presentation/widgets/AuthLayout';

const G = colors.brand;

const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  return (
    <AppBackground>
      <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 32), paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <View style={[styles.mark, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
            <Feather name="check" size={27} color={G.onGradientText} strokeWidth={3} />
          </View>
          <Text style={[styles.eyebrow, { color: G.onGradientTextMuted }]}>SAN MIGUEL · PASTO</Text>
          <Text style={[styles.title, { color: G.onGradientText }]}>Tu tienda, más clara.</Text>
          <Text style={[styles.description, { color: G.onGradientTextMuted }]}>
            Gestiona tu espacio de trabajo con una cuenta segura y vinculada a una sola tienda.
          </Text>
        </View>

        <View style={styles.actions}>
          {!isSupabaseConfigured ? (
            <AuthNotice>Modo desarrollo: usando almacenamiento local (MockAuthService). Los datos persisten entre recargas.</AuthNotice>
          ) : null}
          <Link href="/auth/login" asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.light.primary, opacity: pressed ? 0.78 : 1 }]}>
              <Text style={styles.primaryText}>Iniciar sesión</Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </Pressable>
          </Link>
          <Link href="/auth/register" asChild>
            <Pressable style={({ pressed }) => [styles.secondaryButton, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.secondaryText, { color: G.onGradientText }]}>Crear una cuenta</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.footnote, { color: G.onGradientTextMuted }]}>Tu sesión se guardará localmente después de un inicio de sesión exitoso.</Text>
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  top: { paddingTop: 36, gap: 12 },
  mark: { width: 64, height: 64, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 39, lineHeight: 44, fontWeight: '700', letterSpacing: -1.2 },
  description: { fontSize: 16, lineHeight: 24, maxWidth: 340 },
  actions: { gap: 12 },
  primaryButton: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  secondaryButton: { minHeight: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 14 },
});