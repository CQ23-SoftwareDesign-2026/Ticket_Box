import { Text, StyleSheet, type TextProps } from 'react-native';

import { colors } from '@/constants/theme';

type AppTextProps = TextProps & {
  variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label' | 'eyebrow';
  tone?: 'default' | 'muted' | 'primary' | 'danger' | 'success' | 'warning';
};

export function AppText({ style, variant = 'body', tone = 'default', ...props }: AppTextProps) {
  return <Text {...props} style={[styles.base, variants[variant], tones[tone], style]} />;
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
});

const variants = StyleSheet.create({
  hero: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
  },
  body: {
    fontSize: 15.5,
    lineHeight: 23,
  },
  caption: {
    fontSize: 13,
    lineHeight: 19,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});

const tones = StyleSheet.create({
  default: { color: colors.text },
  muted: { color: colors.textMuted },
  primary: { color: colors.primary },
  danger: { color: colors.danger },
  success: { color: colors.success },
  warning: { color: colors.warning },
});
