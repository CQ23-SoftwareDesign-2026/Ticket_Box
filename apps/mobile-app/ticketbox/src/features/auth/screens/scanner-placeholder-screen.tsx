import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import { routes } from '@/lib/routes';

type PreviewState = 'valid' | 'duplicate' | 'wrong_gate' | 'offline_queue';

export function ScannerPlaceholderScreen() {
  const router = useRouter();
  const { session, isLoading } = useCurrentScanSession();
  const [previewState, setPreviewState] = useState<PreviewState>('valid');
  const [isOfflinePreview, setIsOfflinePreview] = useState(false);

  const previewConfig = useMemo(() => {
    const states = {
      valid: {
        eyebrow: 'Ticket valid',
        title: 'Accepted preview',
        description: 'Alex Rivera - VIP. Entry approved for this gate and concert.',
        tone: 'success' as const,
        icon: 'check-circle',
        panelVariant: 'elevated' as const,
      },
      duplicate: {
        eyebrow: 'Duplicate detected',
        title: 'Already checked in',
        description: 'This QR was already accepted earlier. Staff should verify the attendee before retrying.',
        tone: 'warning' as const,
        icon: 'alert-circle',
        panelVariant: 'default' as const,
      },
      wrong_gate: {
        eyebrow: 'Gate mismatch',
        title: 'Wrong lane for this ticket',
        description: 'The ticket exists, but the attendee should be redirected to the assigned gate.',
        tone: 'danger' as const,
        icon: 'close-circle',
        panelVariant: 'danger' as const,
      },
      offline_queue: {
        eyebrow: 'Offline accepted',
        title: 'Queued for sync',
        description: 'Local validation passed. This scan should be sent automatically when the network returns.',
        tone: 'info' as const,
        icon: 'cloud-clock-outline',
        panelVariant: 'default' as const,
      },
    } as const;

    return states[previewState];
  }, [previewState]);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(routes.staffSessionSetup);
    }
  }, [isLoading, router, session]);

  if (isLoading || !session) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <AppText tone="muted">Preparing scanner session...</AppText>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen scroll={false}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topBarCopy}>
            <AppText variant="eyebrow" tone="muted">
              Live check-in session
            </AppText>
            <AppText variant="label">
              {session.concertTitle} - {session.gateLabel}
            </AppText>
            <AppText tone="muted">{session.concertVenue}</AppText>
          </View>
          <StatusPill label={isOfflinePreview ? 'Offline' : 'Online'} tone={isOfflinePreview ? 'warning' : 'success'} />
        </View>

        <View style={styles.sessionBoard}>
          <View style={styles.sessionBoardBlock}>
            <AppText variant="eyebrow" tone="muted">
              Active gate
            </AppText>
            <AppText variant="subtitle">{session.gateLabel}</AppText>
          </View>
          <View style={styles.sessionBoardDivider} />
          <View style={styles.sessionBoardBlock}>
            <AppText variant="eyebrow" tone="muted">
              Sync strategy
            </AppText>
            <AppText variant="subtitle">{isOfflinePreview ? 'Queue locally' : 'Send instantly'}</AppText>
          </View>
        </View>

        <View style={styles.placeholder}>
          <View style={styles.cameraFog} />
          <View style={styles.cameraTopStrip}>
            <StatusPill label="Rear camera" tone="neutral" />
            <StatusPill label={session.gateLabel} tone="info" />
          </View>

          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </View>

          <View style={styles.sideMetricRail}>
            <View style={styles.sideMetricTile}>
              <AppText variant="eyebrow" tone="muted">
                Accepted
              </AppText>
              <AppText variant="label">420</AppText>
            </View>
            <View style={styles.sideMetricTile}>
              <AppText variant="eyebrow" tone="muted">
                Duplicates
              </AppText>
              <AppText variant="label">12</AppText>
            </View>
          </View>

          <View style={styles.overlayText}>
            <AppText variant="eyebrow" tone="primary">
              Scanner ready
            </AppText>
            <AppText tone="muted">Center the ticket QR inside the frame for instant validation.</AppText>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="muted">
              Scanned
            </AppText>
            <AppText variant="label">420</AppText>
          </View>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="success">
              Synced
            </AppText>
            <AppText variant="label">418</AppText>
          </View>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="danger">
              Pending
            </AppText>
            <AppText variant="label">2</AppText>
          </View>
        </View>

        <View style={styles.previewToolbar}>
          <View style={styles.previewTabs}>
            {[
              { key: 'valid', label: 'Valid' },
              { key: 'duplicate', label: 'Duplicate' },
              { key: 'wrong_gate', label: 'Wrong gate' },
              { key: 'offline_queue', label: 'Offline' },
            ].map((item) => {
              const isActive = item.key === previewState;

              return (
                <Pressable
                  key={item.key}
                  onPress={() => setPreviewState(item.key as PreviewState)}
                  style={[styles.previewTab, isActive ? styles.previewTabActive : null]}
                >
                  <AppText variant="eyebrow" style={isActive ? styles.previewTabTextActive : styles.previewTabText}>
                    {item.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => setIsOfflinePreview((value) => !value)} style={styles.networkToggle}>
            <MaterialCommunityIcons
              color={isOfflinePreview ? colors.warning : colors.primary}
              name={isOfflinePreview ? 'cloud-off-outline' : 'cloud-check-outline'}
              size={18}
            />
            <AppText variant="eyebrow" style={styles.networkToggleText}>
              {isOfflinePreview ? 'Preview offline mode' : 'Preview online mode'}
            </AppText>
          </Pressable>
        </View>

        <SurfaceCard variant={previewConfig.panelVariant} style={styles.resultCard}>
          <View style={styles.resultTop}>
            <View
              style={[
                styles.resultIcon,
                previewConfig.tone === 'success'
                  ? styles.resultIconSuccess
                  : previewConfig.tone === 'warning'
                    ? styles.resultIconWarning
                    : previewConfig.tone === 'danger'
                      ? styles.resultIconDanger
                      : styles.resultIconInfo,
              ]}
            >
              <MaterialCommunityIcons
                color={
                  previewConfig.tone === 'success'
                    ? colors.success
                    : previewConfig.tone === 'warning'
                      ? colors.warning
                      : previewConfig.tone === 'danger'
                        ? colors.danger
                        : colors.primary
                }
                name={previewConfig.icon}
                size={28}
              />
            </View>

            <View style={styles.resultText}>
              <AppText variant="eyebrow" tone={previewConfig.tone === 'info' ? 'primary' : previewConfig.tone}>
                {previewConfig.eyebrow}
              </AppText>
              <AppText variant="title">{previewConfig.title}</AppText>
              <AppText tone="muted">{previewConfig.description}</AppText>
            </View>
          </View>

          <View style={styles.resultMeta}>
            <View style={styles.resultMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Session
              </AppText>
              <AppText variant="label">{session.concertTitle}</AppText>
            </View>
            <View style={styles.resultMetaDivider} />
            <View style={styles.resultMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Gate action
              </AppText>
              <AppText variant="label">
                {previewState === 'wrong_gate' ? 'Redirect guest' : isOfflinePreview ? 'Queue sync' : 'Next scan'}
              </AppText>
            </View>
          </View>

          <View style={styles.resultActions}>
            <Button icon="qrcode-scan" label="Ready for next scan" onPress={() => {}} />
            <Button icon="cog-outline" label="Change session" onPress={() => router.push(routes.staffSessionSetup)} variant="ghost" />
          </View>
        </SurfaceCard>
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
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  topBarCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionBoard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  sessionBoardBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionBoardDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  placeholder: {
    height: 392,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundPanel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 12,
  },
  cameraFog: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surfaceOverlay,
  },
  cameraTopStrip: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  targetFrame: {
    width: 240,
    height: 240,
  },
  sideMetricRail: {
    position: 'absolute',
    top: 84,
    right: spacing.md,
    gap: spacing.sm,
  },
  sideMetricTile: {
    minWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 16, 29, 0.62)',
    gap: spacing.xs,
  },
  corner: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 22,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 22,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 22,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 22,
  },
  scanLine: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.55,
  },
  overlayText: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    gap: spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPanel: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  previewToolbar: {
    gap: spacing.sm,
  },
  previewTabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  previewTabActive: {
    backgroundColor: colors.primary,
  },
  previewTabText: {
    color: colors.textMuted,
  },
  previewTabTextActive: {
    color: colors.background,
  },
  networkToggle: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceOverlay,
  },
  networkToggleText: {
    color: colors.textMuted,
  },
  resultCard: {
    gap: spacing.md,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconSuccess: {
    backgroundColor: colors.successSoft,
  },
  resultIconWarning: {
    backgroundColor: colors.warningSoft,
  },
  resultIconDanger: {
    backgroundColor: colors.dangerSoft,
  },
  resultIconInfo: {
    backgroundColor: colors.infoSoft,
  },
  resultText: {
    flex: 1,
    gap: spacing.xs,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  resultMetaItem: {
    flex: 1,
    gap: spacing.xs,
  },
  resultMetaDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
  resultActions: {
    gap: spacing.sm,
  },
});
