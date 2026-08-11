export const palette = {
  ink: '#0A1028',
  inkRaised: '#141C3D',
  pearl: '#F8F6F1',
  pearlRaised: '#FFFFFF',
  mist: '#CFEAF0',
  aqua: '#29E1D6',
  aquaDeep: '#0AA9A4',
  lilac: '#B89BFF',
  coral: '#FF8E83',
  gold: '#E8C77A',
  danger: '#E45E6D',
  mutedDark: '#94A1C5',
  mutedLight: '#66708A',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
export const radius = { sm: 12, md: 20, lg: 28, pill: 999 } as const;
export const motion = { quick: 160, standard: 260, delight: 520 } as const;

export type AppTheme = 'light' | 'dark';

export function colors(theme: AppTheme) {
  return theme === 'dark'
    ? {
        background: palette.ink,
        surface: palette.inkRaised,
        elevated: '#20294F',
        text: palette.pearl,
        muted: palette.mutedDark,
        border: 'rgba(255,255,255,0.12)',
        glass: 'rgba(20,28,61,0.74)',
        table: '#17244B',
      }
    : {
        background: palette.pearl,
        surface: palette.pearlRaised,
        elevated: '#EDF7F8',
        text: '#18203C',
        muted: palette.mutedLight,
        border: 'rgba(10,16,40,0.10)',
        glass: 'rgba(255,255,255,0.74)',
        table: '#DCEFF0',
      };
}
