import { type PropsWithChildren, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { SurfaceCard } from '@/components/ui/surface-card';
import { colors, radii, spacing } from '@/constants/theme';

type AuthShellProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function AuthShell({ eyebrow, title, description, footer, children }: AuthShellProps) {
  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <AppText variant="eyebrow" tone="primary">
              {eyebrow}
            </AppText>
          </View>
          <View style={styles.brandLockup}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons color={colors.background} name="ticket-confirmation" size={28} />
            </View>
            <View style={styles.brandText}>
              <AppText variant="hero">{title}</AppText>
              <AppText tone="muted">{description}</AppText>
            </View>
          </View>
        </View>

        <SurfaceCard variant="hero">{children}</SurfaceCard>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  hero: {
    gap: spacing.md,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceOverlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  brandLockup: {
    gap: spacing.md,
  },
  brandMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
  brandText: {
    gap: spacing.sm,
  },
  footer: {
    gap: spacing.sm,
  },
});
