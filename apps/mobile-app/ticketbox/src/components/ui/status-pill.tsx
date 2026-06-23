import { View, StyleSheet } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { colors, radii, spacing } from '@/constants/theme';

type StatusPillProps = {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
};

export function StatusPill({ label, tone = 'info' }: StatusPillProps) {
  return (
    <View style={[styles.base, toneStyles[tone]]}>
      <View style={[styles.dot, dotStyles[tone]]} />
      <AppText variant="eyebrow" style={labelStyles[tone]}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});

const toneStyles = StyleSheet.create({
  info: {
    backgroundColor: colors.infoSoft,
  },
  success: {
    backgroundColor: colors.successSoft,
  },
  warning: {
    backgroundColor: colors.warningSoft,
  },
  danger: {
    backgroundColor: colors.dangerSoft,
  },
  neutral: {
    backgroundColor: colors.surfaceOverlay,
  },
});

const dotStyles = StyleSheet.create({
  info: {
    backgroundColor: colors.primary,
  },
  success: {
    backgroundColor: colors.success,
  },
  warning: {
    backgroundColor: colors.warning,
  },
  danger: {
    backgroundColor: colors.danger,
  },
  neutral: {
    backgroundColor: colors.textSoft,
  },
});

const labelStyles = StyleSheet.create({
  info: {
    color: colors.primary,
  },
  success: {
    color: colors.success,
  },
  warning: {
    color: colors.warning,
  },
  danger: {
    color: colors.danger,
  },
  neutral: {
    color: colors.textMuted,
  },
});
