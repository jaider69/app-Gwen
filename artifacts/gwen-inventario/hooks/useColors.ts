import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

/**
 * Returns the design tokens for the current color scheme, plus
 * `gradientHero`: el degradado de marca para superficies destacadas
 * (hero del dashboard y de Gwen), ya resuelto según el esquema activo.
 */
export function useColors() {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? colors.dark : colors.light;
  const gradientHero = scheme === 'dark' ? colors.gradients.heroDark : colors.gradients.hero;
  return { ...palette, radius: colors.radius, gradientHero };
}