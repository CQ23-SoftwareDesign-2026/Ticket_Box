import { type PropsWithChildren } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';

type SurfaceCardProps = PropsWithChildren<{
  variant?: 'default' | 'elevated' | 'hero' | 'danger';
  style?: StyleProp<ViewStyle>;
}>;

export function SurfaceCard({ children, variant = 'default', style }: SurfaceCardProps) {
  return <View style={[styles.card, variantStyles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 10,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
  },
  hero: {
    backgroundColor: colors.backgroundPanel,
    borderRadius: radii.xl,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
});
