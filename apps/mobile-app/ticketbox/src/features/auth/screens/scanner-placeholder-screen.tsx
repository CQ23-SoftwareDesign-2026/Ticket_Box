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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { checkinApi } from '@/features/checkin/api/checkin-api';
import { useCurrentScanSession } from '@/features/checkin/hooks/use-current-scan-session';
import type { ScanTicketResponse, ScanTicketStatus } from '@/features/checkin/types/checkin.types';
import { getErrorMessage } from '@/lib/errors';
import { routes } from '@/lib/routes';
import {
  localScanStorage,
  pendingSyncStorage,
  prefetchStorage,
  recentScanHistoryStorage,
  type PendingSyncScan,
  type RecentScanHistoryItem,
} from '@/lib/storage';

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
const SCANNER_BOTTOM_INSET = 118;

export function ScannerPlaceholderScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const networkState = Network.useNetworkState();
  const { user } = useAuth();
  const { session, isLoading } = useCurrentScanSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [isTorchEnabled, setIsTorchEnabled] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [lastScanData, setLastScanData] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<RecentScanHistoryItem[]>([]);
  const [resultState, setResultState] = useState<LiveResultState>({
    status: 'IDLE',
    tone: 'info',
    title: 'Scanner armed',
    description: 'Center the QR code in the frame.',
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

  useEffect(() => {
    async function loadOfflineState() {
      if (!session) {
        setPendingCount(0);
        setRecentHistory([]);
        return;
      }

      const [queue, history] = await Promise.all([
        pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber),
        recentScanHistoryStorage.getHistoryForSession(session.concertId, session.gateNumber),
      ]);

      setPendingCount(queue.length);
      setRecentHistory(history);
    }

    void loadOfflineState();
  }, [session]);

  useEffect(() => {
    async function syncPendingScans() {
      if (!isOnline || !session || !user?.id || isSyncingPending) {
        return;
      }

      const queue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);

      if (queue.length === 0) {
        setPendingCount(0);
        return;
      }

      setIsSyncingPending(true);

      try {
        const response = await checkinApi.syncTickets({
          concert_id: session.concertId,
          gate_id: session.gateNumber,
          updates: queue.map((item) => ({
            qr_code_hash: item.qrCodeHash,
            scanned_at: item.scannedAt,
          })),
        });

        const updatedCount = Math.min(response.updated, queue.length);
        const conflictCount = Math.min(response.conflicts, Math.max(queue.length - updatedCount, 0));
        const processedCount = Math.min(response.processed, queue.length);
        const successItems = queue.slice(0, updatedCount);
        const conflictItems = queue.slice(updatedCount, updatedCount + conflictCount);
        const processedItems = queue.slice(0, processedCount);

        if (processedItems.length > 0) {
          await pendingSyncStorage.removeMany(processedItems.map((item) => item.id));
        }

        setSyncedCount((count) => count + successItems.length);
        setDuplicateCount((count) => count + conflictItems.length);

        const historyBatches = await Promise.all([
          ...successItems.map((item) =>
            recentScanHistoryStorage.push({
              id: `${item.id}:synced`,
              concertId: item.concertId,
              gateNumber: item.gateNumber,
              qrCodeHash: item.qrCodeHash,
              scannedAt: new Date().toISOString(),
              status: 'SYNCED',
              title: 'Offline scan synced',
              detail: `${shortenQrValue(item.qrCodeHash)} was uploaded to server successfully.`,
            }),
          ),
          ...conflictItems.map((item) =>
            recentScanHistoryStorage.push({
              id: `${item.id}:conflict`,
              concertId: item.concertId,
              gateNumber: item.gateNumber,
              qrCodeHash: item.qrCodeHash,
              scannedAt: new Date().toISOString(),
              status: 'SYNC_CONFLICT',
              title: 'Sync conflict',
              detail: `${shortenQrValue(item.qrCodeHash)} was already scanned before this device synced.`,
            }),
          ),
        ]);

        const remainingQueue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);
        setPendingCount(remainingQueue.length);
        setRecentHistory(historyBatches.at(-1) ?? []);
      } catch {
        const remainingQueue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);
        setPendingCount(remainingQueue.length);
      } finally {
        setIsSyncingPending(false);
      }
    }

    void syncPendingScans();
  }, [isOnline, isSyncingPending, session, user?.id]);

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
      description: 'Center the QR code in the frame.',
      gateAction: 'Await scan',
      guestLabel: 'Ready for next guest',
      icon: 'qrcode-scan',
      panelVariant: 'default',
    });
  };

  const refreshOfflinePanels = async (concertId: string, gateNumber: number) => {
    const [queue, history] = await Promise.all([
      pendingSyncStorage.getQueueForSession(concertId, gateNumber),
      recentScanHistoryStorage.getHistoryForSession(concertId, gateNumber),
    ]);

    setPendingCount(queue.length);
    setRecentHistory(history);
  };

  const pushHistoryItem = async (item: RecentScanHistoryItem) => {
    const nextHistory = await recentScanHistoryStorage.push(item);
    setRecentHistory(nextHistory.filter((entry) => entry.concertId === item.concertId && entry.gateNumber === item.gateNumber));
  };

  const applyScanResult = async (qrValue: string, response: ScanTicketResponse) => {
    setScannedCount((count) => count + 1);
    setLastScanData(qrValue);

    switch (response.status) {
      case 'ACCEPTED':
        setAcceptedCount((count) => count + 1);
        setSyncedCount((count) => count + 1);
        if (session) {
          await localScanStorage.addHash(session.concertId, session.gateNumber, qrValue);
        }
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
        if (session) {
          await pushHistoryItem({
            id: `online:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
            concertId: session.concertId,
            gateNumber: session.gateNumber,
            qrCodeHash: qrValue,
            scannedAt: response.scanned_at ?? new Date().toISOString(),
            status: 'ACCEPTED',
            title: 'Online check-in accepted',
            detail: `${shortenQrValue(qrValue)} was validated by the server for ${session.gateLabel}.`,
          });
        }
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
        if (session) {
          await pushHistoryItem({
            id: `duplicate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
            concertId: session.concertId,
            gateNumber: session.gateNumber,
            qrCodeHash: qrValue,
            scannedAt: response.scanned_at ?? new Date().toISOString(),
            status: 'DUPLICATE',
            title: 'Duplicate ticket detected',
            detail: `${shortenQrValue(qrValue)} was already used earlier.`,
          });
        }
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
        if (session) {
          await pushHistoryItem({
            id: `invalid-gate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
            concertId: session.concertId,
            gateNumber: session.gateNumber,
            qrCodeHash: qrValue,
            scannedAt: new Date().toISOString(),
            status: 'INVALID_GATE',
            title: 'Wrong gate scanned',
            detail: `${shortenQrValue(qrValue)} does not belong to ${session.gateLabel}.`,
          });
        }
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
        if (session) {
          await pushHistoryItem({
            id: `not-found:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
            concertId: session.concertId,
            gateNumber: session.gateNumber,
            qrCodeHash: qrValue,
            scannedAt: new Date().toISOString(),
            status: 'NOT_FOUND',
            title: 'Ticket not found',
            detail: `${shortenQrValue(qrValue)} was not found in backend records.`,
          });
        }
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
        if (session) {
          await pushHistoryItem({
            id: `unpaid:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
            concertId: session.concertId,
            gateNumber: session.gateNumber,
            qrCodeHash: qrValue,
            scannedAt: new Date().toISOString(),
            status: 'UNPAID',
            title: 'Unpaid ticket',
            detail: `${shortenQrValue(qrValue)} belongs to an unpaid order.`,
          });
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
    }
  };

  const handleOfflineScan = async (qrValue: string) => {
    if (!session || !user?.id) {
      return;
    }

    const [prefetchedSet, isLocallyScanned, queuedItems] = await Promise.all([
      prefetchStorage.getPrefetchedTicketSet(),
      localScanStorage.hasHash(session.concertId, session.gateNumber, qrValue),
      pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber),
    ]);

    const matchesActiveSession =
      prefetchedSet &&
      prefetchedSet.concertId === session.concertId &&
      prefetchedSet.gateNumber === session.gateNumber;

    if (!matchesActiveSession) {
      setScannedCount((count) => count + 1);
      setLastScanData(qrValue);
      setResultState({
        status: 'OFFLINE',
        tone: 'warning',
        title: 'Prefetch expired for this session',
        description: 'Refresh this session online before using offline scan.',
        gateAction: 'Return to setup',
        guestLabel: shortenQrValue(qrValue),
        icon: 'database-alert-outline',
        panelVariant: 'default',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (!prefetchedSet.hashes.includes(qrValue)) {
      setScannedCount((count) => count + 1);
      setLastScanData(qrValue);
      setResultState({
        status: 'NOT_FOUND',
        tone: 'danger',
        title: 'Hash not in offline set',
        description: 'This QR code is not in the prefetched gate set.',
        gateAction: 'Reject entry',
        guestLabel: shortenQrValue(qrValue),
        icon: 'help-circle',
        panelVariant: 'danger',
      });
      await pushHistoryItem({
        id: `offline-not-found:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
        concertId: session.concertId,
        gateNumber: session.gateNumber,
        qrCodeHash: qrValue,
        scannedAt: new Date().toISOString(),
        status: 'NOT_FOUND',
        title: 'Offline hash missing',
        detail: `${shortenQrValue(qrValue)} is not in the prefetched hash set.`,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const isAlreadyQueued = queuedItems.some((item) => item.qrCodeHash === qrValue);

    if (isLocallyScanned || isAlreadyQueued) {
      setScannedCount((count) => count + 1);
      setDuplicateCount((count) => count + 1);
      setLastScanData(qrValue);
      setResultState({
        status: 'DUPLICATE',
        tone: 'warning',
        title: 'Already scanned on this device',
        description: 'This ticket was already accepted on this device.',
        gateAction: 'Verify attendee',
        guestLabel: shortenQrValue(qrValue),
        icon: 'alert-circle',
        panelVariant: 'default',
      });
      await pushHistoryItem({
        id: `offline-duplicate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
        concertId: session.concertId,
        gateNumber: session.gateNumber,
        qrCodeHash: qrValue,
        scannedAt: new Date().toISOString(),
        status: 'DUPLICATE',
        title: 'Offline duplicate blocked',
        detail: `${shortenQrValue(qrValue)} was already accepted on this device.`,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    const scannedAt = new Date().toISOString();
    const pendingItem: PendingSyncScan = {
      id: `pending:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
      concertId: session.concertId,
      gateNumber: session.gateNumber,
      qrCodeHash: qrValue,
      scannedAt,
      scannedBy: user.id,
    };

    await Promise.all([
      localScanStorage.addHash(session.concertId, session.gateNumber, qrValue),
      pendingSyncStorage.enqueue(pendingItem),
    ]);

    setScannedCount((count) => count + 1);
    setAcceptedCount((count) => count + 1);
    setLastScanData(qrValue);
    setResultState({
      status: 'OFFLINE',
      tone: 'success',
      title: 'Offline ticket accepted',
      description: 'Saved locally and will sync when the device is online.',
      gateAction: 'Allow entry',
      guestLabel: shortenQrValue(qrValue),
      icon: 'check-decagram',
      panelVariant: 'elevated',
    });
    await pushHistoryItem({
      id: `offline-accepted:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
      concertId: session.concertId,
      gateNumber: session.gateNumber,
      qrCodeHash: qrValue,
      scannedAt,
      status: 'OFFLINE_ACCEPTED',
      title: 'Offline scan saved',
      detail: `${shortenQrValue(qrValue)} was accepted locally and queued for sync.`,
    });
    await refreshOfflinePanels(session.concertId, session.gateNumber);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const trimmedData = data.trim();

    if (!isOnline) {
      try {
        await handleOfflineScan(trimmedData);
      } finally {
        unlockScannerSoon();
      }
      return;
    }

    try {
      const response = await checkinApi.scanTicket({
        concert_id: session.concertId,
        gate_id: session.gateNumber,
        qr_code_hash: trimmedData,
        scanned_at: new Date().toISOString(),
      });

      await applyScanResult(trimmedData, response);
    } catch (error) {
      setLastScanData(trimmedData);
      setResultState({
        status: 'ERROR',
        tone: 'danger',
        title: 'Scan request failed',
        description: getErrorMessage(error, 'Unable to validate this ticket right now.'),
        gateAction: 'Retry scan',
        guestLabel: shortenQrValue(trimmedData),
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
            onBarcodeScanned={isFocused ? handleBarcodeScanned : undefined}
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
                name={resultState.icon}
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
              {recentHistory.slice(0, 5).map((item) => (
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
                      <AppText variant="label">{item.title}</AppText>
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
  historyRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});
