import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function ProfileScreen() {
  const { user, logout, isSubmitting } = useAuth();

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="eyebrow" tone="primary">
            Staff identity
          </AppText>
          <AppText variant="hero">Profile</AppText>
          <AppText tone="muted">Review the active staff account and confirm what this device is currently allowed to operate.</AppText>
        </View>

        <SurfaceCard variant="hero">
          <View style={styles.identityRow}>
            <View style={styles.identityBadge}>
              <MaterialCommunityIcons color={colors.primary} name="account-badge-outline" size={28} />
            </View>
            <View style={styles.identityText}>
              <AppText variant="subtitle">{user?.fullName}</AppText>
              <AppText tone="muted">{user?.email}</AppText>
            </View>
          </View>
          <StatusPill label="Verified staff session" tone="info" />
          <View style={styles.metaGrid}>
            <View style={styles.metaCard}>
              <AppText variant="eyebrow" tone="muted">
                Roles
              </AppText>
              <AppText variant="subtitle">{(user?.roles ?? []).join(', ')}</AppText>
            </View>
            <View style={styles.metaCard}>
              <AppText variant="eyebrow" tone="muted">
                Permissions
              </AppText>
              <AppText variant="subtitle">{user?.permissions?.length ? user.permissions.join(', ') : 'None returned'}</AppText>
            </View>
          </View>
        </SurfaceCard>

        <SurfaceCard variant="default">
          <AppText variant="subtitle">Account policy</AppText>
          <AppText tone="muted">
            Checker and admin accounts are issued by TicketBox. If you need a password reset or role update, contact the system administrator.
          </AppText>
        </SurfaceCard>

        <Button icon="logout" label="Sign out" onPress={logout} variant="danger" loading={isSubmitting} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityBadge: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  metaGrid: {
    gap: spacing.md,
  },
  metaCard: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.surfaceOverlay,
  },
});
