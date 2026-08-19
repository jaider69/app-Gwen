import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/useColors';

const phases = [
  { number: '01', title: 'Identidad y acceso', detail: 'Autenticación y vínculo seguro entre usuario y tienda.', state: 'Ahora' },
  { number: '02', title: 'Productos e inventario', detail: 'Catálogo, existencias, entradas y movimientos.', state: 'Después' },
  { number: '03', title: 'Alertas y reportes', detail: 'Stock bajo, vencimientos y consultas básicas.', state: 'Después' },
  { number: '04', title: 'Sincronización', detail: 'Cola offline y sincronización con el servicio remoto.', state: 'Después' },
  { number: '05', title: 'Gwen por voz', detail: 'Interacción por comandos de voz, sin predicciones.', state: 'Futuro' },
  { number: '06', title: 'Predicción de demanda', detail: 'Integración futura con la API REST del modelo Python.', state: 'Futuro' },
];

export default function RoadmapScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Plan por fases', headerShown: false }} />
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver al inicio"
              testID="roadmap-back"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, { backgroundColor: colors.secondary, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="arrow-left" size={20} color={colors.primary} />
            </Pressable>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: colors.primary }]}>DESARROLLO PROGRESIVO</Text>
              <Text style={[styles.title, { color: colors.foreground }]}>Un paso a la vez.</Text>
            </View>
          </View>

          <Text style={[styles.intro, { color: colors.mutedForeground }]}>
            Cada fase debe conservar lo anterior, poder probarse por separado y evitar funcionalidades que todavía no tienen soporte real.
          </Text>

          <View style={styles.timeline}>
            {phases.map((phase, index) => {
              const isCurrent = index === 0;
              return (
                <View key={phase.number} style={styles.phaseRow}>
                  <View style={styles.timelineRail}>
                    <View style={[styles.phaseNumber, { backgroundColor: isCurrent ? colors.primary : colors.secondary }]}>
                      <Text style={[styles.phaseNumberText, { color: isCurrent ? colors.primaryForeground : colors.primary }]}>
                        {phase.number}
                      </Text>
                    </View>
                    {index < phases.length - 1 ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}
                  </View>
                  <View style={[styles.phaseCard, { backgroundColor: colors.card, borderColor: isCurrent ? colors.primary : colors.border }]}>
                    <View style={styles.phaseTop}>
                      <Text style={[styles.phaseTitle, { color: colors.cardForeground }]}>{phase.title}</Text>
                      <Text style={[styles.phaseState, { color: isCurrent ? colors.primary : colors.mutedForeground }]}>{phase.state}</Text>
                    </View>
                    <Text style={[styles.phaseDetail, { color: colors.mutedForeground }]}>{phase.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={[styles.note, { backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={18} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.secondaryForeground }]}>
              No se implementan predicciones, contabilidad, facturación, nómina ni funciones empresariales avanzadas en esta etapa.
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 3 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7 },
  intro: { fontSize: 15, lineHeight: 23 },
  timeline: { gap: 12 },
  phaseRow: { flexDirection: 'row', gap: 12, minHeight: 86 },
  timelineRail: { width: 42, alignItems: 'center' },
  phaseNumber: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  phaseNumberText: { fontSize: 12, fontWeight: '700' },
  line: { width: 1, flex: 1, marginVertical: 6 },
  phaseCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14, gap: 7 },
  phaseTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  phaseTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  phaseState: { fontSize: 11, fontWeight: '600' },
  phaseDetail: { fontSize: 13, lineHeight: 18 },
  note: { borderRadius: 18, padding: 16, flexDirection: 'row', gap: 10 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});