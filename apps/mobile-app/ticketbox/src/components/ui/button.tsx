import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={spinnerColor[variant]} /> : null}
        {!loading && icon ? <MaterialCommunityIcons color={iconColor[variant]} name={icon} size={18} /> : null}
        <AppText
          variant="label"
          style={[styles.label, labelStyles[variant]]}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.55,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.26,
    shadowRadius: 22,
    elevation: 8,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  ghost: {
    backgroundColor: colors.surfaceOverlay,
  },
  danger: {
    backgroundColor: colors.danger,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.background,
  },
  secondary: {
    color: colors.text,
  },
  ghost: {
    color: colors.textMuted,
  },
  danger: {
    color: colors.background,
  },
});

const iconColor = {
  primary: colors.background,
  secondary: colors.text,
  ghost: colors.textMuted,
  danger: colors.background,
} as const;

const spinnerColor = iconColor;
