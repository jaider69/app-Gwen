import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useColors } from '@/hooks/useColors';
export { AuthInput } from '@/src/presentation/widgets/AuthInput';

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + (Platform.OS === 'web' ? 67 : 18),
            paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 24),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.back, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.heading}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primary, opacity: disabled ? 0.45 : pressed ? 0.78 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{label}</Text>
      <Feather name="arrow-right" size={19} color={colors.primaryForeground} />
    </Pressable>
  );
}

export function AuthNotice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'error' }) {
  const colors = useColors();
  return (
    <View style={[styles.notice, { backgroundColor: tone === 'error' ? '#FCEBEB' : colors.secondary }]}>
      <Feather name={tone === 'error' ? 'alert-circle' : 'info'} size={18} color={tone === 'error' ? colors.destructive : colors.primary} />
      <Text style={[styles.noticeText, { color: tone === 'error' ? colors.destructive : colors.secondaryForeground }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  back: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heading: { gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  description: { fontSize: 15, lineHeight: 22 },
  button: { minHeight: 56, borderRadius: 17, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  notice: { borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19 },
});