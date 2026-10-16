import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/useColors';

type ReadinessRowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  detail: string;
};

export function ReadinessRow({ icon, title, detail }: ReadinessRowProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
        <Feather name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>{title}</Text>
        <Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text>
      </View>
      <Feather name="check-circle" size={18} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontWeight: '700' },
  detail: { fontSize: 13, lineHeight: 18 },
});