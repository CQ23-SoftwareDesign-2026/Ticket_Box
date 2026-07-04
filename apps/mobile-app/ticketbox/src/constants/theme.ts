export const colors = {
  background: '#07111f',
  backgroundMuted: '#0d1930',
  backgroundPanel: '#0f1b30',
  surface: '#13213a',
  surfaceElevated: '#182945',
  surfaceSoft: '#1d3455',
  surfaceOverlay: '#112540',
  border: '#223a5f',
  borderStrong: '#37527d',
  text: '#f5f7fb',
  textMuted: '#b7c3d8',
  textSoft: '#7f93b2',
  primary: '#5ea1ff',
  primaryPressed: '#377fdb',
  primaryGlow: 'rgba(94, 161, 255, 0.22)',
  success: '#34c78a',
  successSoft: 'rgba(52, 199, 138, 0.16)',
  warning: '#ffb24c',
  warningSoft: 'rgba(255, 178, 76, 0.16)',
  danger: '#ff6b7d',
  dangerSoft: 'rgba(255, 107, 125, 0.16)',
  infoSoft: 'rgba(94, 161, 255, 0.18)',
  shadow: '#000000',
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
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Colors = {
  light: {
    text: colors.text,
    background: colors.background,
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
