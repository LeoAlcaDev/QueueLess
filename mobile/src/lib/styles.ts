import type { Palette } from '@/theme';

// Tono semántico de estado, para badges y banners. No vive en el tema (que solo
// tiene los tokens de color), sino acá, porque es una noción de dominio de UI.
export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand' | 'points';

export type TonePalette = { bg: string; fg: string; dot: string };

// resuelve un tono a su trío bg/fg/dot dentro de la paleta activa; el neutral se
// apoya en los neutros tibios, y el de estrellas usa el ámbar del estado warning
export function toneColors(colors: Palette, tone: StatusTone): TonePalette {
  switch (tone) {
    case 'success':
      return { bg: colors.successBg, fg: colors.successFg, dot: colors.successDot };
    case 'warning':
      return { bg: colors.warningBg, fg: colors.warningFg, dot: colors.warningDot };
    case 'error':
      return { bg: colors.errorBg, fg: colors.errorFg, dot: colors.errorDot };
    case 'info':
      return { bg: colors.infoBg, fg: colors.infoFg, dot: colors.infoDot };
    case 'brand':
      return { bg: colors.brandSoft, fg: colors.textBrand, dot: colors.brand };
    case 'points':
      return { bg: colors.pointsSoft, fg: colors.pointsStrong, dot: colors.points };
    case 'neutral':
    default:
      return { bg: colors.bgSurface2, fg: colors.textSecondary, dot: colors.textMuted };
  }
}

// amarillo de las estrellas de rating (no es un token de marca, es el ámbar de estado)
export function starColor(colors: Palette): string {
  return colors.warningDot;
}
