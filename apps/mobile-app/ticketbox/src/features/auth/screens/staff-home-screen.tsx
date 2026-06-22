import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import { routes } from '@/lib/routes';

export function StaffHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { session } = useCurrentScanSession();

  const activeStartTime = session
    ? new Date(session.prefetchedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <AppScreen>
      <View style={styles.container}>
        <SurfaceCard variant="hero" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <AppText variant="eyebrow" tone="primary">
                Event operations
              </AppText>
              <AppText variant="hero">Good evening, {user?.fullName?.split(' ')[0] ?? 'staff'}.</AppText>
              <AppText tone="muted">
                Run ticket control from one premium surface: prepare the gate, open the scanner, and keep the entry line moving.
              </AppText>
            </View>
            <View style={styles.avatarBadge}>
              <MaterialCommunityIcons color={colors.primary} name="shield-account-outline" size={24} />
            </View>
          </View>

          <StatusPill label="Gate-ready account" tone="success" />

          {session ? (
            <View style={styles.liveSessionPanel}>
              <View style={styles.liveSessionHeader}>
                <View style={styles.liveSessionLabel}>
                  <AppText variant="eyebrow" tone="primary">
                    Current scan session
                  </AppText>
                  <AppText variant="subtitle">{session.concertTitle}</AppText>
                </View>
                <StatusPill label={session.gateLabel} tone="info" />
              </View>

              <View style={styles.sessionMetaRow}>
                <View style={styles.metaBlock}>
                  <AppText variant="eyebrow" tone="muted">
                    Venue
                  </AppText>
                  <AppText variant="label">{session.concertVenue}</AppText>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.metaBlock}>
                  <AppText variant="eyebrow" tone="muted">
                    Started
                  </AppText>
                  <AppText variant="label">{activeStartTime}</AppText>
                </View>
              </View>

              <View style={styles.sessionActions}>
                <Button icon="qrcode-scan" label="Open scanner" onPress={() => router.push(routes.staffScanner)} />
                <Button
                  icon="tune-vertical-variant"
                  label="Change session"
                  onPress={() => router.push(routes.staffSessionSetup)}
                  variant="ghost"
                />
              </View>
            </View>
          ) : (
            <Button icon="play-circle-outline" label="Start check-in session" onPress={() => router.push(routes.staffSessionSetup)} />
          )}

          <View style={styles.statsRow}>
            <View style={styles.statTile}>
              <AppText variant="eyebrow" tone="muted">
                Tonight
              </AppText>
              <AppText variant="subtitle">1,240 scanned</AppText>
            </View>
            <View style={styles.statTile}>
              <AppText variant="eyebrow" tone="muted">
                Access
              </AppText>
              <AppText variant="subtitle">{(user?.roles ?? []).join(', ')}</AppText>
            </View>
          </View>
        </SurfaceCard>

        <View style={styles.metricsBoard}>
          <View style={styles.metricColumn}>
            <AppText variant="eyebrow" tone="muted">
              Queue risk
            </AppText>
            <AppText variant="subtitle">Low</AppText>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricColumn}>
            <AppText variant="eyebrow" tone="muted">
              Network
            </AppText>
            <AppText variant="subtitle">Stable</AppText>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricColumn}>
            <AppText variant="eyebrow" tone="muted">
              Pending sync
            </AppText>
            <AppText variant="subtitle">18 tickets</AppText>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <SurfaceCard variant="elevated" style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIconWrap}>
                <MaterialCommunityIcons color={colors.primary} name="playlist-check" size={22} />
              </View>
              <View style={styles.actionHeaderText}>
                <StatusPill label="Recommended" tone="info" />
                <AppText variant="subtitle">Session control</AppText>
                <AppText tone="muted">
                  Choose the concert, assign the gate lane, and prepare offline data before the team enters scan mode.
                </AppText>
              </View>
            </View>
            <Button icon="arrow-right" label="Configure session" onPress={() => router.push(routes.staffSessionSetup)} />
          </SurfaceCard>

          <SurfaceCard variant="default" style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIconWrap}>
                <MaterialCommunityIcons color={colors.warning} name="chart-box-outline" size={22} />
              </View>
              <View style={styles.actionHeaderText}>
                <AppText variant="subtitle">Operational pulse</AppText>
                <AppText tone="muted">Front gate health and scan outcomes.</AppText>
              </View>
            </View>
            <View style={styles.snapshotList}>
              <View style={styles.snapshotRow}>
                <AppText tone="muted">Accepted</AppText>
                <AppText variant="label">1,180</AppText>
              </View>
              <View style={styles.snapshotRow}>
                <AppText tone="muted">Duplicates</AppText>
                <AppText variant="label">42</AppText>
              </View>
              <View style={styles.snapshotRow}>
                <AppText tone="muted">Offline queued</AppText>
                <AppText variant="label">18</AppText>
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard variant="default" style={styles.actionCard}>
            <View style={styles.actionHeader}>
              <View style={styles.actionIconWrap}>
                <MaterialCommunityIcons color={colors.success} name="account-circle-outline" size={22} />
              </View>
              <View style={styles.actionHeaderText}>
                <AppText variant="subtitle">Account clearance</AppText>
                <AppText tone="muted">Review profile, role and device access.</AppText>
              </View>
            </View>
            <Button icon="account-outline" label="View profile" onPress={() => router.push(routes.staffProfile)} variant="ghost" />
          </SurfaceCard>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  heroCard: {
    gap: spacing.lg,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  avatarBadge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveSessionPanel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceOverlay,
  },
  liveSessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  liveSessionLabel: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  metaDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  sessionActions: {
    gap: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statTile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceOverlay,
  },
  metricsBoard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  metricColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  metricDivider: {
    width: 1,
    marginHorizontal: spacing.md,
    backgroundColor: colors.border,
  },
  quickGrid: {
    gap: spacing.md,
  },
  actionCard: {
    gap: spacing.md,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  snapshotList: {
    gap: spacing.sm,
  },
  snapshotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
