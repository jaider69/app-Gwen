import React from 'react';
import { Text, TextInput, StyleSheet } from 'react-native';

/**
 * Aplica la familia Inter como fuente por defecto en toda la app,
 * sin tener que editar cada archivo que usa <Text> o <TextInput>.
 *
 * Elige automáticamente el peso de Inter correcto según el `fontWeight`
 * ya definido en cada estilo (400/500/600/700), y respeta cualquier
 * fontFamily que ya esté puesto explícitamente (ej. la fuente monoespaciada
 * de ErrorFallback.tsx).
 */
function pickInterFamily(fontWeight: string | number | undefined): string {
  switch (String(fontWeight)) {
    case '700':
    case 'bold':
      return 'Inter_700Bold';
    case '600':
      return 'Inter_600SemiBold';
    case '500':
      return 'Inter_500Medium';
    default:
      return 'Inter_400Regular';
  }
}

function patchWithInterFont(Component: any) {
  if (!Component || Component.__interFontApplied) return;
  const originalRender = Component.render;
  if (typeof originalRender !== 'function') return;

  Component.__interFontApplied = true;
  Component.render = function patchedRender(...args: any[]) {
    const element = originalRender.apply(this, args);
    const flattened = StyleSheet.flatten(element.props.style) || {};
    if (flattened.fontFamily) {
      return element;
    }
    const fontFamily = pickInterFamily(flattened.fontWeight);
    return React.cloneElement(element, {
      style: [{ fontFamily }, element.props.style],
    });
  };
}

export function applyInterFontGlobally(): void {
  patchWithInterFont(Text as any);
  patchWithInterFont(TextInput as any);
}