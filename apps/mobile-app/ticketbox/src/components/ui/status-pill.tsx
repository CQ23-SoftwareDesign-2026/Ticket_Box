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
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderWidth: 1,
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
    borderColor: 'rgba(94, 161, 255, 0.24)',
  },
  success: {
    backgroundColor: colors.successSoft,
    borderColor: 'rgba(52, 199, 138, 0.24)',
  },
  warning: {
    backgroundColor: colors.warningSoft,
    borderColor: 'rgba(255, 178, 76, 0.24)',
  },
  danger: {
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(255, 107, 125, 0.22)',
  },
  neutral: {
    backgroundColor: colors.surfaceOverlay,
    borderColor: colors.border,
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
