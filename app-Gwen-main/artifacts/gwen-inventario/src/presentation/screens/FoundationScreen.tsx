import { Feather } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';
import { PhaseBadge } from '@/src/presentation/widgets/PhaseBadge';
import { ReadinessRow } from '@/src/presentation/widgets/ReadinessRow';

const readinessItems = [
  { icon: 'wifi-off' as const, title: 'Offline-first desde el inicio', detail: 'La base local y la cola de sincronización están separadas del resto de la app.' },
  { icon: 'shield' as const, title: 'Datos aislados por tienda', detail: 'La identidad de usuario y la tienda serán el límite de acceso de cada registro.' },
  { icon: 'layers' as const, title: 'Crecimiento por fases', detail: 'Inventario, ventas, voz y predicción quedan fuera hasta que corresponda.' },
];

export default function FoundationScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const webBottomInset = Platform.OS === 'web' ? 34 : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + webTopInset + 24, paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
            <Feather name="check" size={22} color={colors.primaryForeground} strokeWidth={3} />
          </View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>SAN MIGUEL · PASTO</Text>
            <Text style={[styles.brandName, { color: colors.foreground }]}>Gwen Inventario</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <PhaseBadge label="BASE PREPARADA" />
          <Text style={[styles.title, { color: colors.foreground }]}>Tu tienda, más clara desde el primer día.</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Una base sencilla y resistente para construir el inventario por fases, incluso cuando no haya conexión.
          </Text>
        </View>

        <View style={[styles.nextCard, { backgroundColor: colors.primary }]}>
          <View style={styles.nextCardCopy}>
            <Text style={[styles.nextLabel, { color: colors.secondaryForeground }]}>SIGUIENTE FASE</Text>
            <Text style={[styles.nextTitle, { color: colors.primaryForeground }]}>Identidad y acceso seguro</Text>
            <Text style={[styles.nextDetail, { color: colors.secondaryForeground }]}>
              El próximo paso será conectar cada usuario con una única tienda.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver el plan de fases"
            testID="view-roadmap"
            onPress={() => router.push('/roadmap')}
            style={({ pressed }) => [
              styles.nextButton,
              { backgroundColor: colors.primaryForeground, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Feather name="arrow-up-right" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Qué queda listo hoy</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Sin datos de prueba</Text>
        </View>

        <View style={styles.readinessList}>
          {readinessItems.map((item) => (
            <ReadinessRow key={item.title} {...item} />
          ))}
        </View>

        <View style={[styles.guardrail, { borderColor: colors.border }]}>
          <Feather name="info" size={18} color={colors.primary} />
          <Text style={[styles.guardrailText, { color: colors.mutedForeground }]}>
            Las predicciones de demanda y Gwen por voz no están activas todavía. Se integrarán después mediante servicios independientes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandMark: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  brandName: { fontSize: 19, fontWeight: '700', marginTop: 2 },
  hero: { gap: 12, paddingTop: 18 },
  title: { fontSize: 36, lineHeight: 42, fontWeight: '700', letterSpacing: -1.2 },
  subtitle: { fontSize: 16, lineHeight: 24 },
  nextCard: { borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  nextCardCopy: { flex: 1, gap: 8 },
  nextLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  nextTitle: { fontSize: 23, lineHeight: 28, fontWeight: '700' },
  nextDetail: { fontSize: 14, lineHeight: 20 },
  nextButton: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionHint: { fontSize: 12 },
  readinessList: { gap: 10 },
  guardrail: { borderTopWidth: 1, paddingTop: 16, flexDirection: 'row', gap: 10 },
  guardrailText: { flex: 1, fontSize: 13, lineHeight: 19 },
});