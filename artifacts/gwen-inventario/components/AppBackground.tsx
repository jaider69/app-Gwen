import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import colors from '@/constants/colors';

/**
 * Fondo de marca compartido: el mismo degradado azul en toda la app,
 * fijo (no cambia con el modo claro/oscuro del dispositivo).
 */
export function AppBackground({ children }: PropsWithChildren) {
  return (
    <LinearGradient
      colors={colors.brand.gradient}
      locations={colors.brand.gradientLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});