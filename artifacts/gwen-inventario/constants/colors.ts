/**
 * Semantic design tokens for the mobile app.
 *
 * Paleta basada en un azul confiable (#1F5C8C) inspirado en un degradado
 * marino-a-celeste, elegida por contraste alto y legibilidad para usuarios
 * con distintos niveles de alfabetización digital (tenderos).
 */

const colors = {
  light: {
    text: '#16283D',
    tint: '#1F5C8C',

    background: '#F5F8FB',
    foreground: '#16283D',

    card: '#FFFFFF',
    cardForeground: '#16283D',

    primary: '#1F5C8C',
    primaryForeground: '#FFFFFF',

    secondary: '#E4F0F8',
    secondaryForeground: '#164A73',

    muted: '#E7EEF3',
    mutedForeground: '#5B7184',

    accent: '#F6C85F',
    accentForeground: '#6B4E00',

    destructive: '#C94C4C',
    destructiveForeground: '#FFFFFF',

    border: '#D7E3EC',
    input: '#D7E3EC',
  },

  dark: {
    text: '#EAF2F8',
    tint: '#6FB8E6',
    background: '#0F2436',
    foreground: '#EAF2F8',
    card: '#16324A',
    cardForeground: '#EAF2F8',
    primary: '#6FB8E6',
    primaryForeground: '#0F2436',
    secondary: '#1C4664',
    secondaryForeground: '#CDE6F7',
    muted: '#1B3A52',
    mutedForeground: '#9CBBD1',
    accent: '#F6C85F',
    accentForeground: '#0F2436',
    destructive: '#F28383',
    destructiveForeground: '#0F2436',
    border: '#2A4C68',
    input: '#2A4C68',
  },

  // Degradado de marca para superficies destacadas (hero del dashboard y de Gwen)
  gradients: {
    hero: ['#1B3358', '#4FA3D1'] as [string, string],
    heroDark: ['#0F2436', '#3D82AE'] as [string, string],
  },
    // Fondo de marca fijo (no cambia con modo claro/oscuro), usado solo en el
  // Dashboard para lograr el look "degradado difuminado" de la imagen de referencia.
    // Fondo de marca fijo (no cambia con modo claro/oscuro), usado en toda la
  // app para lograr el look "degradado difuminado" de la imagen de referencia.
  brand: {
    gradient: ['#12233A', '#1E4F73', '#3E86AE', '#7BC7E9'] as [string, string, string, string],
    gradientLocations: [0, 0.35, 0.7, 1] as [number, number, number, number],
    // Texto y elementos "sueltos" (no dentro de una tarjeta blanca) que van
    // directamente sobre el degradado.
    onGradientText: '#FFFFFF',
    onGradientTextMuted: 'rgba(255,255,255,0.82)',
    onGradientGlassBg: 'rgba(255,255,255,0.16)',
    onGradientGlassBorder: 'rgba(255,255,255,0.32)',
  },

  radius: 16,
};

export default colors;