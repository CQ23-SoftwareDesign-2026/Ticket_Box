import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/use-auth';

export function PendingApprovalScreen() {
  const { user, logout, isSubmitting } = useAuth();

  return (
    <AppScreen scroll={false}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.lockWrap}>
            <View style={styles.lockIcon}>
              <MaterialCommunityIcons color={colors.danger} name="shield-lock-outline" size={38} />
            </View>
          </View>
          <StatusPill label="Access blocked" tone="danger" />
          <AppText variant="hero">Unauthorized access</AppText>
          <AppText tone="muted">
            {user?.fullName ?? 'Your account'} is signed in, but this app is reserved for active Checker and Admin accounts working at the venue.
          </AppText>
        </View>

        <SurfaceCard variant="danger">
          <AppText variant="subtitle">What happens next</AppText>
          <AppText tone="muted">
            Your current account can authenticate successfully, but it is not allowed to operate gate scanning tools. Ask TicketBox to assign the correct staff role before signing in again.
          </AppText>
          <AppText tone="muted">Current roles: {(user?.roles ?? []).join(', ') || 'Audience'}</AppText>
        </SurfaceCard>

        <View style={styles.actions}>
          <Button label="Checker role required" onPress={() => {}} variant="ghost" disabled />
          <Button icon="logout" label="Sign out" onPress={logout} loading={isSubmitting} />
        </View>
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
  lockWrap: {
    alignItems: 'center',
  },
  lockIcon: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  actions: {
    gap: spacing.md,
  },
});
