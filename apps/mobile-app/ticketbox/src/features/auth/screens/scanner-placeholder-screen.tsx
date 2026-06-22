import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { useIsFocused } from '@react-navigation/native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';
import { colors, radii, spacing } from '@/constants/theme';
import { checkinApi } from '@/features/checkin/api/checkin-api';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import type { ScanTicketResponse, ScanTicketStatus } from '@/features/checkin/types/checkin.types';
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';

type LiveResultState = {
  description: string;
  gateAction: string;
  guestLabel: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  panelVariant: 'default' | 'elevated' | 'danger';
  status: ScanTicketStatus | 'IDLE' | 'OFFLINE' | 'ERROR';
  title: string;
  tone: 'info' | 'success' | 'warning' | 'danger';
};

const SCAN_COOLDOWN_MS = 1800;

export function ScannerPlaceholderScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const networkState = Network.useNetworkState();
  const { session, isLoading } = useCurrentScanSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [pendingCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [lastScanData, setLastScanData] = useState<string | null>(null);
  const [resultState, setResultState] = useState<LiveResultState>({
    status: 'IDLE',
    tone: 'info',
    title: 'Scanner armed',
    description: 'Center a QR code inside the frame to validate the ticket for this concert and gate.',
    gateAction: 'Await scan',
    guestLabel: 'Ready for next guest',
    icon: 'qrcode-scan',
    panelVariant: 'default',
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledScanRef = useRef<{ value: string; at: number } | null>(null);

  const isOnline = networkState.isConnected === true && networkState.isInternetReachable !== false;

  const topStatus = useMemo(
    () => (isOnline ? { label: 'Online', tone: 'success' as const } : { label: 'Offline', tone: 'warning' as const }),
    [isOnline],
  );

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace(routes.staffSessionSetup);
    }
  }, [isLoading, router, session]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const unlockScannerSoon = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsProcessingScan(false);
    }, SCAN_COOLDOWN_MS);
  };

  const resetScanner = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsProcessingScan(false);
    setLastScanData(null);
    setResultState({
      status: 'IDLE',
      tone: 'info',
      title: 'Scanner armed',
      description: 'Center a QR code inside the frame to validate the ticket for this concert and gate.',
      gateAction: 'Await scan',
      guestLabel: 'Ready for next guest',
      icon: 'qrcode-scan',
      panelVariant: 'default',
    });
  };

  const applyScanResult = async (qrValue: string, response: ScanTicketResponse) => {
    setScanCount((count) => count + 1);
    setLastScanData(qrValue);

    switch (response.status) {
      case 'ACCEPTED':
        setSyncedCount((count) => count + 1);
        setResultState({
          status: 'ACCEPTED',
          tone: 'success',
          title: 'Entry approved',
          description: 'This ticket is valid for the active concert and gate. The check-in has been recorded on the server.',
          gateAction: 'Allow entry',
          guestLabel: shortenQrValue(qrValue),
          icon: 'check-circle',
          panelVariant: 'elevated',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'DUPLICATE':
        setDuplicateCount((count) => count + 1);
        setResultState({
          status: 'DUPLICATE',
          tone: 'warning',
          title: 'Already checked in',
          description: response.scanned_at
            ? `This ticket was already scanned at ${formatScanTime(response.scanned_at)}.`
            : 'This ticket was already scanned previously.',
          gateAction: 'Verify attendee',
          guestLabel: shortenQrValue(qrValue),
          icon: 'alert-circle',
          panelVariant: 'default',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'INVALID_GATE':
        setResultState({
          status: 'INVALID_GATE',
          tone: 'danger',
          title: 'Wrong gate for this ticket',
          description: 'The ticket exists but does not match the active gate or concert in this session.',
          gateAction: 'Redirect guest',
          guestLabel: shortenQrValue(qrValue),
          icon: 'close-circle',
          panelVariant: 'danger',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'NOT_FOUND':
        setResultState({
          status: 'NOT_FOUND',
          tone: 'danger',
          title: 'Ticket not found',
          description: 'The scanned QR code does not exist in the backend system.',
          gateAction: 'Reject entry',
          guestLabel: shortenQrValue(qrValue),
          icon: 'help-circle',
          panelVariant: 'danger',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'UNPAID':
        setResultState({
          status: 'UNPAID',
          tone: 'warning',
          title: 'Order not paid',
          description: 'The ticket record exists, but the related order has not been paid yet.',
          gateAction: 'Send to support desk',
          guestLabel: shortenQrValue(qrValue),
          icon: 'cash-remove',
          panelVariant: 'default',
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  };

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (!session || !data || isProcessingScan) {
      return;
    }

    const now = Date.now();
    const previous = lastHandledScanRef.current;

    if (previous && previous.value === data && now - previous.at < SCAN_COOLDOWN_MS) {
      return;
    }

    lastHandledScanRef.current = { value: data, at: now };
    setIsProcessingScan(true);

    if (!isOnline) {
      setLastScanData(data);
      setResultState({
        status: 'OFFLINE',
        tone: 'warning',
        title: 'Offline mode detected',
        description: 'Online scan API is paused because the device has no internet connection. Offline validation and sync are the next step.',
        gateAction: 'Wait for network',
        guestLabel: shortenQrValue(data),
        icon: 'cloud-off-outline',
        panelVariant: 'default',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      unlockScannerSoon();
      return;
    }

    try {
      const response = await checkinApi.scanTicket({
        concert_id: session.concertId,
        gate_id: session.gateNumber,
        qr_code_hash: data.trim(),
        scanned_at: new Date().toISOString(),
      });

      await applyScanResult(data.trim(), response);
    } catch (error) {
      setLastScanData(data);
      setResultState({
        status: 'ERROR',
        tone: 'danger',
        title: 'Scan request failed',
        description: getErrorMessage(error, 'Unable to validate this ticket right now.'),
        gateAction: 'Retry scan',
        guestLabel: shortenQrValue(data),
        icon: 'server-network-off',
        panelVariant: 'danger',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      unlockScannerSoon();
    }
  };

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
    <AppScreen contentBottomPadding={20} scroll={false}>
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
              <AppText variant="label">Sessions</AppText>
            </Pressable>
            <View style={styles.topBarCopy}>
              <AppText variant="eyebrow" tone="muted">
                Live check-in session
              </AppText>
              <AppText variant="label">
                {session.concertTitle} - {session.gateLabel}
              </AppText>
              <AppText tone="muted">{session.concertVenue}</AppText>
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
          </View>
        </View>

        <View style={styles.placeholder}>
          <CameraView
            active={isFocused}
            autofocus="off"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            enableTorch={isTorchEnabled}
            facing="back"
            onBarcodeScanned={isFocused ? handleBarcodeScanned : undefined}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.cameraTopStrip}>
            <StatusPill label="Rear camera" tone="neutral" />
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

          <View style={styles.sideMetricRail}>
            <View style={styles.sideMetricTile}>
              <AppText variant="eyebrow" tone="muted">
                Accepted
              </AppText>
              <AppText variant="label">{syncedCount}</AppText>
            </View>
            <View style={styles.sideMetricTile}>
              <AppText variant="eyebrow" tone="muted">
                Duplicates
              </AppText>
              <AppText variant="label">{duplicateCount}</AppText>
            </View>
          </View>

          <View style={styles.overlayText}>
            <AppText variant="eyebrow" tone="primary">
              {isProcessingScan ? 'Validating ticket' : 'Scanner ready'}
            </AppText>
            <AppText tone="muted">
              {isProcessingScan
                ? 'Hold steady while the API confirms the scanned QR code.'
                : 'Center the ticket QR inside the frame for instant validation.'}
            </AppText>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="muted">
              Scanned
            </AppText>
            <AppText variant="label">{scanCount}</AppText>
          </View>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="success">
              Synced
            </AppText>
            <AppText variant="label">{syncedCount}</AppText>
          </View>
          <View style={styles.statPanel}>
            <AppText variant="eyebrow" tone="danger">
              Pending
            </AppText>
            <AppText variant="label">{pendingCount}</AppText>
          </View>
        </View>

        <SurfaceCard variant={resultState.panelVariant} style={styles.resultCard}>
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
                name={resultState.icon}
                size={28}
              />
            </View>

            <View style={styles.resultText}>
              <AppText variant="eyebrow" tone={resultState.tone === 'info' ? 'primary' : resultState.tone}>
                {formatEyebrow(resultState.status)}
              </AppText>
              <AppText variant="title">{resultState.title}</AppText>
              <AppText tone="muted">{resultState.description}</AppText>
            </View>
          </View>

          <View style={styles.resultMeta}>
            <View style={styles.resultMetaItem}>
              <AppText variant="eyebrow" tone="muted">
                Last scan
              </AppText>
              <AppText variant="label">{lastScanData ? resultState.guestLabel : 'No ticket scanned yet'}</AppText>
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

function shortenQrValue(value: string) {
  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function formatScanTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
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
