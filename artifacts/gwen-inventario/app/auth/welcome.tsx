import { Feather } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { AuthNotice } from '@/src/presentation/widgets/AuthLayout';

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const configured = Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 32), paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.top}>
          <View style={[styles.mark, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={27} color={colors.primaryForeground} strokeWidth={3} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>SAN MIGUEL · PASTO</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Tu tienda, más clara.</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            Gestiona tu espacio de trabajo con una cuenta segura y vinculada a una sola tienda.
          </Text>
        </View>

        <View style={styles.actions}>
          {!configured ? (
            <AuthNotice>Supabase todavía no está configurado. Puedes preparar el flujo y conectarlo después desde Secrets.</AuthNotice>
          ) : null}
          <Link href="/auth/login" asChild>
            <Pressable style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.78 : 1 }]}>
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>Iniciar sesión</Text>
              <Feather name="arrow-right" size={20} color={colors.primaryForeground} />
            </Pressable>
          </Link>
          <Link href="/auth/register" asChild>
            <Pressable style={({ pressed }) => [styles.secondaryButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}>
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>Crear una cuenta</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Tu sesión se guardará localmente después de un inicio de sesión exitoso.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between' },
  top: { paddingTop: 36, gap: 12 },
  mark: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 39, lineHeight: 44, fontWeight: '700', letterSpacing: -1.2 },
  description: { fontSize: 16, lineHeight: 24, maxWidth: 340 },
  actions: { gap: 12 },
  primaryButton: { minHeight: 58, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { fontSize: 16, fontWeight: '700' },
  secondaryButton: { minHeight: 58, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 16, fontWeight: '700' },
  footnote: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 14 },
});