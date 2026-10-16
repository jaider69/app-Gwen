import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

export default function SplashScreen() {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.mark, { backgroundColor: colors.primary }]}>
        <Feather name="check" size={24} color={colors.primaryForeground} strokeWidth={3} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Gwen Inventario</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Preparando tu espacio seguro</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  mark: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14 },
});