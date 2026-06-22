export const colors = {
  background: '#06101d',
  backgroundMuted: '#0b1726',
  backgroundPanel: '#101f32',
  surface: '#12253c',
  surfaceElevated: '#18324e',
  surfaceSoft: '#223f60',
  surfaceOverlay: 'rgba(255,255,255,0.04)',
  border: 'rgba(125, 166, 210, 0.16)',
  borderStrong: 'rgba(125, 166, 210, 0.28)',
  text: '#f4f7fb',
  textMuted: '#a3b7cc',
  textSoft: '#7f95ad',
  primary: '#61bbff',
  primaryPressed: '#3f9fe4',
  primaryGlow: 'rgba(97, 187, 255, 0.28)',
  success: '#3fd8a4',
  successSoft: 'rgba(63, 216, 164, 0.16)',
  warning: '#f5bc56',
  warningSoft: 'rgba(245, 188, 86, 0.16)',
  danger: '#ff7083',
  dangerSoft: 'rgba(255, 112, 131, 0.16)',
  infoSoft: 'rgba(97, 187, 255, 0.16)',
  shadow: '#02060b',
} as const;

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const Colors = {
  light: {
    text: colors.text,
    background: '#ffffff',
    tint: colors.primary,
    icon: colors.textSoft,
    tabIconDefault: colors.textSoft,
    tabIconSelected: colors.primary,
  },
  dark: {
    text: colors.text,
    background: colors.background,
    tint: colors.primary,
    icon: colors.textSoft,
    tabIconDefault: colors.textSoft,
    tabIconSelected: colors.primary,
  },
};

export const Fonts = {
  regular: 'System',
};
