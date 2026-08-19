/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#102A43',
    tint: '#1F9D75',

    // Core surfaces
    background: '#F6F8F5',
    foreground: '#102A43',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#102A43',

    // Primary action color (buttons, links, active states)
    primary: '#1F9D75',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E5F3ED',
    secondaryForeground: '#176B52',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EAF0EC',
    mutedForeground: '#627D73',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F6C85F',
    accentForeground: '#6B4E00',

    // Destructive actions (delete, error states)
    destructive: '#C94C4C',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#D8E2DC',
    input: '#D8E2DC',
  },

  dark: {
    text: '#F4F7F5',
    tint: '#64D2A8',
    background: '#102A43',
    foreground: '#F4F7F5',
    card: '#173A55',
    cardForeground: '#F4F7F5',
    primary: '#64D2A8',
    primaryForeground: '#102A43',
    secondary: '#1D4B5C',
    secondaryForeground: '#C9F2DF',
    muted: '#1D4056',
    mutedForeground: '#A9C5B8',
    accent: '#F6C85F',
    accentForeground: '#102A43',
    destructive: '#F28383',
    destructiveForeground: '#102A43',
    border: '#2C5667',
    input: '#2C5667',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
