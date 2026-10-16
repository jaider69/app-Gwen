import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

export function PhaseBadge({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.accent }]}>
      <View style={[styles.dot, { backgroundColor: colors.accentForeground }]} />
      <Text style={[styles.label, { color: colors.accentForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 7 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
});