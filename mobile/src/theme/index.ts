// ============================================================================
// QueueLess — Theme tokens (React Native)  ·  src/theme/index.ts
// ----------------------------------------------------------------------------
// RN no tiene CSS variables: los tokens del design system (marca NARANJA, los
// mismos de web/src/styles/tokens.css) se portan a este objeto TS. light + dark
// conmutan por useColorScheme(). Ningún componente hardcodea hex: todo lee de
// useTheme().colors / spacing / radii / type. Las refs var()→var() del CSS están
// resueltas a hex/rgba concretos (RN no encadena variables).
// ============================================================================
import { Easing, type TextStyle, type ViewStyle } from 'react-native';

/* ───────── Compartido (no cambia por modo) ───────── */
export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

// Radios rígidos: 3 valores + pill. Sin intermedios.
export const radii = { input: 10, button: 10, card: 14, modal: 16, pill: 999 } as const;

export const fontSize = {
  display: 36, h1: 32, h2: 24, h3: 20, body: 16, small: 14, badge: 12,
} as const;

// Manrope embebida (expo-font). Android NO sintetiza grosores → una familia por peso.
// Registra estos names con useFonts({ 'Manrope-Regular': require(...), ... }).
export const fontFamily = {
  regular:  'Manrope-Regular',   // 400
  medium:   'Manrope-Medium',    // 500
  semibold: 'Manrope-SemiBold',  // 600
  bold:     'Manrope-Bold',      // 700
} as const;

// Easing del sistema (out-quart). Sin bounces. 150–250ms. (Countdown del anillo = lineal.)
export const easing = Easing.bezier(0.2, 0.8, 0.2, 1);

/* ───────── Paletas ───────── */
export type Palette = {
  brand: string; brandStrong: string; brandHover: string; brandSoft: string;
  onBrand: string; textBrand: string;
  accent: string; accentSoft: string; accentText: string;
  points: string; pointsSoft: string; pointsStrong: string;
  bgPage: string; bgSurface: string; bgSurface2: string; bgOverlay: string;
  textPrimary: string; textSecondary: string; textMuted: string; textInverse: string;
  borderDefault: string; borderStrong: string; borderFocus: string;
  // Estados (cada uno bg + fg + dot). Nunca solo por color: dot/ícono + texto.
  successBg: string; successFg: string; successDot: string;
  warningBg: string; warningFg: string; warningDot: string;
  errorBg: string;   errorFg: string;   errorDot: string;
  infoBg: string;    infoFg: string;    infoDot: string;
};

const light: Palette = {
  brand: '#F97316', brandStrong: '#EA580C', brandHover: '#C2410C', brandSoft: '#FFF1E6',
  onBrand: '#FFFFFF', textBrand: '#C2410C',
  accent: '#16A34A', accentSoft: 'rgba(22,163,74,0.12)', accentText: '#15803D',
  points: '#9333EA', pointsSoft: 'rgba(147,51,234,0.12)', pointsStrong: '#7E22CE',
  bgPage: '#FFFBF7', bgSurface: '#FFFFFF', bgSurface2: '#F5F5F4', bgOverlay: 'rgba(28,25,23,0.50)',
  textPrimary: '#1C1917', textSecondary: '#78716C', textMuted: '#A8A29E', textInverse: '#FFFFFF',
  borderDefault: '#E7E5E4', borderStrong: '#D6D3D1', borderFocus: '#F97316',
  successBg: 'rgba(22,163,74,0.12)', successFg: '#15803D', successDot: '#16A34A',
  warningBg: 'rgba(245,158,11,0.14)', warningFg: '#B45309', warningDot: '#F59E0B',
  errorBg: 'rgba(220,38,38,0.12)', errorFg: '#B91C1C', errorDot: '#DC2626',
  infoBg: 'rgba(37,99,235,0.12)', infoFg: '#1D4ED8', infoDot: '#2563EB',
};

const dark: Palette = {
  brand: '#FB923C', brandStrong: '#EA580C', brandHover: '#F97316', brandSoft: 'rgba(249,115,22,0.16)',
  onBrand: '#FFFFFF', textBrand: '#FB923C',
  accent: '#4ADE80', accentSoft: 'rgba(22,163,74,0.18)', accentText: '#86EFAC',
  points: '#C084FC', pointsSoft: 'rgba(147,51,234,0.20)', pointsStrong: '#E9D5FF',
  bgPage: '#1C1917', bgSurface: '#292524', bgSurface2: '#44403C', bgOverlay: 'rgba(0,0,0,0.60)',
  textPrimary: '#FAFAF9', textSecondary: '#D6D3D1', textMuted: '#A8A29E', textInverse: '#1C1917',
  borderDefault: '#57534E', borderStrong: '#6B655F', borderFocus: '#FB923C',
  successBg: 'rgba(22,163,74,0.18)', successFg: '#86EFAC', successDot: '#22C55E',
  warningBg: 'rgba(245,158,11,0.18)', warningFg: '#FCD34D', warningDot: '#F59E0B',
  errorBg: 'rgba(220,38,38,0.18)', errorFg: '#FCA5A5', errorDot: '#EF4444',
  infoBg: 'rgba(37,99,235,0.20)', infoFg: '#93C5FD', infoDot: '#60A5FA',
};

/* ───────── Sombras (RN: shadow* iOS + elevation Android) ─────────
   Por defecto las CARDS no llevan sombra: viven sobre bgPage con 1px de borde.
   La sombra se reserva para flotantes (sheets, modales, FAB) y hover web. */
export const shadow = {
  light: {
    sm: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    lg: { shadowColor: '#1C1917', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 10 },
  },
  dark: {
    sm: { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.45, shadowRadius: 3, elevation: 1 },
    md: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.50, shadowRadius: 6, elevation: 3 },
    lg: { shadowColor: '#000000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.55, shadowRadius: 20, elevation: 10 },
  },
} satisfies Record<'light' | 'dark', Record<'sm' | 'md' | 'lg', ViewStyle>>;

/* ───────── Presets tipográficos (RN: lineHeight/letterSpacing en px) ─────────
   Sentence case por defecto. Precios y códigos: usa fontVariant ['tabular-nums']. */
export function makeType(c: Palette): Record<string, TextStyle> {
  return {
    display:      { fontFamily: fontFamily.bold, fontSize: 36, lineHeight: 43, letterSpacing: -0.72, color: c.textPrimary },
    h1:           { fontFamily: fontFamily.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.32, color: c.textPrimary },
    h2:           { fontFamily: fontFamily.semibold, fontSize: 24, lineHeight: 32, color: c.textPrimary },
    h3:           { fontFamily: fontFamily.semibold, fontSize: 20, lineHeight: 27, color: c.textPrimary },
    body:         { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: c.textPrimary },
    bodySecondary:{ fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24, color: c.textSecondary },
    small:        { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    label:        { fontFamily: fontFamily.medium, fontSize: 14, lineHeight: 20, color: c.textSecondary },
    badge:        { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 12, letterSpacing: 0.12 },
    sectionLabel: { fontFamily: fontFamily.semibold, fontSize: 12, lineHeight: 12, letterSpacing: 0.96, textTransform: 'uppercase', color: c.textMuted },
  };
}

/* ───────── Tema completo + helper de modo ───────── */
export type Theme = {
  mode: 'light' | 'dark';
  colors: Palette;
  type: Record<string, TextStyle>;
  shadow: Record<'sm' | 'md' | 'lg', ViewStyle>;
  spacing: typeof spacing;
  radii: typeof radii;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  easing: typeof easing;
};

export function buildTheme(mode: 'light' | 'dark'): Theme {
  const colors = mode === 'dark' ? dark : light;
  return { mode, colors, type: makeType(colors), shadow: shadow[mode], spacing, radii, fontFamily, fontSize, easing };
}

export const themes = { light: buildTheme('light'), dark: buildTheme('dark') };
