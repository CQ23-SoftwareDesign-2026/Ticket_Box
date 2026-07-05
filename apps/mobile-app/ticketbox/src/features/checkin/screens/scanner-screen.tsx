import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Network from 'expo-network';
import { useIsFocused } from '@react-navigation/native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import { useScannerController } from '@/features/checkin/hooks/use-scanner-controller';
import type { LiveResultState } from '@/features/checkin/services/scanner-result.service';
import { formatScanTime, formatTicketTypes } from '@/features/checkin/utils/checkin-formatters';
import { formatPrefetchAge, isPrefetchExpired } from '@/features/checkin/utils/session-validity';
import { routes } from '@/lib/routes';

const SCANNER_BOTTOM_INSET = 118;

export function ScannerScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const networkState = Network.useNetworkState();
  const { user } = useAuth();
  const { session, isLoading } = useCurrentScanSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);

  const isOnline = networkState.isConnected === true && networkState.isInternetReachable !== false;
  const {
    acceptedCount,
    duplicateCount,
    handleBarcodeScanned,
    isProcessingScan,
    isSyncingPending,
    lastScanData,
    pendingCount,
    recentHistory,
    resetScanner,
    resultState,
    scannedCount,
    syncedCount,
    topStatus,
  } = useScannerController({
    isOnline,
    session,
    userId: user?.id,
  });

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

  const prefetchExpired = isPrefetchExpired(session.prefetchedAt);
  const prefetchAgeLabel = formatPrefetchAge(session.prefetchedAt);

  if (!permission) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
          <AppText tone="muted">Checking camera permission...</AppText>
        </View>
      </AppScreen>
    );
  }

  if (!permission.granted) {
    return (
      <AppScreen>
        <View style={styles.permissionState}>
          <SurfaceCard variant="hero" style={styles.permissionCard}>
            <View style={styles.permissionIconWrap}>
              <MaterialCommunityIcons color={colors.primary} name="camera-outline" size={30} />
            </View>
            <AppText variant="hero">Camera access required</AppText>
            <AppText tone="muted">
              TicketBox Staff needs camera permission to scan ticket QR codes at the gate for {session.concertTitle}.
            </AppText>
            <Button icon="camera-outline" label="Allow camera access" onPress={() => void requestPermission()} />
            <Button icon="arrow-left" label="Back to session" onPress={() => router.push(routes.staffSessionSetup)} variant="ghost" />
          </SurfaceCard>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen contentBottomPadding={0} scroll={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topBar}>
            <View style={styles.topBarLeft}>
              <Pressable onPress={() => router.push(routes.staffSessionSetup)} style={styles.backButton}>
                <MaterialCommunityIcons color={colors.text} name="arrow-left" size={18} />
                <AppText variant="label">Change gate</AppText>
              </Pressable>
              <View style={styles.topBarCopy}>
                <AppText variant="eyebrow" tone="muted">
                  Live check-in session
                </AppText>
                <AppText variant="label">
                  {session.concertTitle} - {session.gateLabel}
                </AppText>
                {session.ticketTypeLabels?.length ? (
                  <AppText tone="muted">
                    Ticket types: {formatTicketTypes(session.ticketTypeLabels)}
                  </AppText>
                ) : null}
              </View>
            </View>
            <StatusPill label={topStatus.label} tone={topStatus.tone} />
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
                Prefetched
              </AppText>
              <AppText variant="subtitle">{session.prefetchedHashCount.toLocaleString()} hashes</AppText>
              <AppText tone="muted">{prefetchAgeLabel}</AppText>
            </View>
          </View>

          <View style={styles.bannerRow}>
            <StatusPill label={prefetchExpired ? 'Prefetch expired' : 'Prefetch ready'} tone={prefetchExpired ? 'warning' : 'success'} />
            <StatusPill label={`${pendingCount} pending sync`} tone={pendingCount > 0 ? 'warning' : 'neutral'} />
          </View>

          <View style={styles.quickActionRow}>
            <Pressable onPress={resetScanner} style={styles.quickActionButton}>
              <MaterialCommunityIcons color={colors.text} name="refresh" size={18} />
              <AppText variant="label">Reset state</AppText>
            </Pressable>
            <Pressable onPress={() => router.push(routes.staffSessionSetup)} style={styles.quickActionButton}>
              <MaterialCommunityIcons color={colors.text} name="tune-vertical-variant" size={18} />
              <AppText variant="label">Change session</AppText>
            </Pressable>
          </View>

          <View style={styles.placeholder}>
            <CameraView
              active={isFocused}
              autofocus="off"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              enableTorch={isTorchEnabled}
              facing="back"
              onBarcodeScanned={isFocused ? (result) => void handleBarcodeScanned(result) : undefined}
              style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.cameraTopStrip}>
              <StatusPill label={isSyncingPending ? 'Syncing queue' : 'Rear camera'} tone={isSyncingPending ? 'info' : 'neutral'} />
              <View style={styles.cameraActions}>
                <StatusPill label={session.gateLabel} tone="info" />
                <Pressable onPress={() => setIsTorchEnabled((value) => !value)} style={styles.cameraIconButton}>
                  <MaterialCommunityIcons
                    color={isTorchEnabled ? colors.warning : colors.textMuted}
                    name={isTorchEnabled ? 'flashlight' : 'flashlight-off'}
                    size={18}
                  />
                </Pressable>
              </View>
            </View>

            <View pointerEvents="none" style={styles.targetFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.scanLine} />
            </View>

            <View style={styles.overlayText}>
              <AppText variant="eyebrow" tone="primary">
                {isProcessingScan ? 'Validating ticket' : 'Scanner ready'}
              </AppText>
              <AppText tone="muted">
                {isProcessingScan
                  ? isOnline
                    ? 'Checking ticket...'
                    : 'Checking offline...'
                  : isOnline
                    ? 'Center the ticket QR in the frame.'
                    : 'Offline scans will sync later.'}
              </AppText>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statPanel}>
              <AppText variant="caption" tone="muted" numberOfLines={1}>
                Scans
              </AppText>
              <AppText numberOfLines={1} style={styles.statValue} variant="label">
                {scannedCount}
              </AppText>
            </View>
            <View style={styles.statPanel}>
              <AppText variant="caption" tone="success" numberOfLines={1}>
                Accepted
              </AppText>
              <AppText numberOfLines={1} style={styles.statValue} variant="label">
                {acceptedCount}
              </AppText>
            </View>
            <View style={styles.statPanel}>
              <AppText variant="caption" tone="warning" numberOfLines={1}>
                Pending
              </AppText>
              <AppText numberOfLines={1} style={styles.statValue} variant="label">
                {pendingCount}
              </AppText>
            </View>
          </View>

          <View style={styles.secondaryStatRow}>
            <View style={styles.secondaryStatPill}>
              <AppText variant="eyebrow" tone="muted">
                Duplicates
              </AppText>
              <AppText variant="label">{duplicateCount}</AppText>
            </View>
            <View style={styles.secondaryStatPill}>
              <AppText variant="eyebrow" tone={isSyncingPending ? 'primary' : 'muted'}>
                Synced
              </AppText>
              <AppText variant="label">{syncedCount}</AppText>
            </View>
          </View>

          <SurfaceCard
            variant={resultState.panelVariant}
            style={[
              styles.resultCard,
              resultState.tone === 'success'
                ? styles.resultCardSuccess
                : resultState.tone === 'warning'
                  ? styles.resultCardWarning
                  : resultState.tone === 'danger'
                    ? styles.resultCardDanger
                    : styles.resultCardInfo,
            ]}
          >
            <View style={styles.resultTop}>
              <View
                style={[
                  styles.resultIcon,
                  resultState.tone === 'success'
                    ? styles.resultIconSuccess
                    : resultState.tone === 'warning'
                      ? styles.resultIconWarning
                      : resultState.tone === 'danger'
                        ? styles.resultIconDanger
                        : styles.resultIconInfo,
                ]}
              >
                <MaterialCommunityIcons
                  color={
                    resultState.tone === 'success'
                      ? colors.success
                      : resultState.tone === 'warning'
                        ? colors.warning
                        : resultState.tone === 'danger'
                          ? colors.danger
                          : colors.primary
                  }
                  name={resultState.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={28}
                />
              </View>

              <View style={styles.resultText}>
                <AppText variant="eyebrow" tone={resultState.tone === 'info' ? 'primary' : resultState.tone}>
                  {formatEyebrow(resultState.status)}
                </AppText>
                <AppText variant="title">{resultState.title}</AppText>
                <AppText numberOfLines={2} tone="muted">{resultState.description}</AppText>
              </View>
            </View>

            <View style={styles.resultMeta}>
              <View style={styles.resultMetaItem}>
                <AppText variant="eyebrow" tone="muted">
                  Last scan
                </AppText>
                <AppText numberOfLines={1} variant="label">{lastScanData ? resultState.guestLabel : 'No scan yet'}</AppText>
              </View>
              <View style={styles.resultMetaDivider} />
              <View style={styles.resultMetaItem}>
                <AppText variant="eyebrow" tone="muted">
                  Gate action
                </AppText>
                <AppText variant="label">{resultState.gateAction}</AppText>
              </View>
            </View>

            <View style={styles.resultActions}>
              <Button
                icon="qrcode-scan"
                label={isProcessingScan ? 'Processing scan...' : 'Ready for next scan'}
                onPress={resetScanner}
                disabled={isProcessingScan}
              />
              <Button icon="cog-outline" label="Change session" onPress={() => router.push(routes.staffSessionSetup)} variant="ghost" />
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <View style={styles.historyHeaderCopy}>
                <AppText variant="eyebrow" tone="muted">
                  Recent
                </AppText>
                <AppText variant="title">Latest scans</AppText>
              </View>
              <StatusPill label={isOnline ? 'Live sync' : 'Queued offline'} tone={isOnline ? 'success' : 'warning'} />
            </View>

            {recentHistory.length === 0 ? (
              <AppText tone="muted">No scan activity yet for this session.</AppText>
            ) : (
              <View style={styles.historyList}>
                {recentHistory.slice(0, 10).map((item) => (
                  <View key={item.id} style={styles.historyRow}>
                    <View
                      style={[
                        styles.historyToneBar,
                        item.status === 'ACCEPTED' || item.status === 'OFFLINE_ACCEPTED' || item.status === 'SYNCED'
                          ? styles.historyToneSuccess
                          : item.status === 'DUPLICATE' || item.status === 'UNPAID' || item.status === 'SYNC_CONFLICT'
                            ? styles.historyToneWarning
                            : styles.historyToneDanger,
                      ]}
                    />
                    <View style={styles.historyContent}>
                      <View style={styles.historyRowTop}>
                        <View style={styles.historyMeta}>
                          <AppText variant="label">{item.title}</AppText>
                          <StatusPill label={formatHistoryStatus(item.status)} tone={getHistoryTone(item.status)} />
                        </View>
                        <AppText tone="muted">{formatScanTime(item.scannedAt)}</AppText>
                      </View>
                      <AppText tone="muted">{item.detail}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </SurfaceCard>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

function formatEyebrow(status: LiveResultState['status']) {
  switch (status) {
    case 'ACCEPTED':
      return 'Ticket valid';
    case 'DUPLICATE':
      return 'Duplicate detected';
    case 'INVALID_GATE':
      return 'Gate mismatch';
    case 'NOT_FOUND':
      return 'Ticket missing';
    case 'UNPAID':
      return 'Payment issue';
    case 'OFFLINE':
      return 'Offline mode';
    case 'ERROR':
      return 'Service issue';
    default:
      return 'Scanner live';
  }
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SCANNER_BOTTOM_INSET,
  },
  container: {
    minHeight: '100%',
    justifyContent: 'flex-start',
    gap: spacing.xl,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  permissionState: {
    flex: 1,
    justifyContent: 'center',
  },
  permissionCard: {
    gap: spacing.lg,
    alignItems: 'center',
  },
  permissionIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  topBarLeft: {
    flex: 1,
    gap: spacing.sm,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surfaceOverlay,
  },
  topBarCopy: {
    gap: spacing.xs,
  },
  sessionBoard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: '#101d33',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  sessionBoardBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  sessionBoardDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  bannerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeholder: {
    height: 392,
    borderRadius: radii.lg,
    backgroundColor: colors.backgroundPanel,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.28,
    shadowRadius: 30,
    elevation: 12,
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
  cameraActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cameraIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 16, 29, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: 240,
    height: 240,
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
  secondaryStatRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statPanel: {
    flex: 1,
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#101d33',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  statValue: {
    fontSize: 18,
    lineHeight: 24,
  },
  secondaryStatPill: {
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultCard: {
    gap: spacing.md,
    borderWidth: 1,
    shadowOpacity: 0.16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 5,
  },
  resultCardInfo: {
    backgroundColor: '#11294a',
    borderColor: 'rgba(94, 161, 255, 0.24)',
  },
  resultCardSuccess: {
    backgroundColor: '#10281d',
    borderColor: 'rgba(52, 199, 138, 0.24)',
  },
  resultCardWarning: {
    backgroundColor: '#33260f',
    borderColor: 'rgba(255, 178, 76, 0.24)',
  },
  resultCardDanger: {
    backgroundColor: '#34141d',
    borderColor: 'rgba(255, 107, 125, 0.24)',
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
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: 'rgba(7, 17, 31, 0.34)',
    borderWidth: 1,
    borderColor: 'rgba(127, 147, 178, 0.22)',
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
    gap: spacing.md,
  },
  historyCard: {
    gap: spacing.md,
    backgroundColor: '#101d33',
    borderColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  historyHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  historyList: {
    gap: spacing.md,
  },
  historyRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: '#0d1728',
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyToneBar: {
    width: 4,
    borderRadius: 999,
  },
  historyToneSuccess: {
    backgroundColor: colors.success,
  },
  historyToneWarning: {
    backgroundColor: colors.warning,
  },
  historyToneDanger: {
    backgroundColor: colors.danger,
  },
  historyContent: {
    flex: 1,
    gap: spacing.xs,
  },
  historyMeta: {
    flex: 1,
    gap: spacing.xs,
  },
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});

function formatHistoryStatus(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return 'Accepted';
    case 'DUPLICATE':
      return 'Duplicate';
    case 'INVALID_GATE':
      return 'Wrong gate';
    case 'NOT_FOUND':
      return 'Not found';
    case 'OFFLINE_ACCEPTED':
      return 'Offline accepted';
    case 'SYNCED':
      return 'Synced';
    case 'SYNC_CONFLICT':
      return 'Conflict';
    case 'UNPAID':
      return 'Unpaid';
    default:
      return status.replace(/_/g, ' ').toLowerCase();
  }
}

function getHistoryTone(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (status === 'ACCEPTED' || status === 'OFFLINE_ACCEPTED' || status === 'SYNCED') {
    return 'success';
  }

  if (status === 'DUPLICATE' || status === 'SYNC_CONFLICT' || status === 'UNPAID') {
    return 'warning';
  }

  if (status === 'INVALID_GATE' || status === 'NOT_FOUND') {
    return 'danger';
  }

  return 'info';
}
