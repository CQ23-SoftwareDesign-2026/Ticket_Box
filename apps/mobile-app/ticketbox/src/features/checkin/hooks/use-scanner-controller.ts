import { useEffect, useMemo, useRef, useState } from 'react';
import { type BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { checkinApi } from '@/features/checkin/api/checkin-api';
import {
  localScanStorage,
  pendingSyncStorage,
  prefetchStorage,
  recentScanHistoryStorage,
  type CurrentScanSession,
  type RecentScanHistoryItem,
} from '@/features/checkin/storage/checkin-storage';
import { processOfflineScan } from '@/features/checkin/services/offline-scan.service';
import { syncPendingQueue } from '@/features/checkin/services/pending-sync.service';
import {
  createErrorResultState,
  createIdleResultState,
  createOnlineScanFeedback,
  type LiveResultState,
} from '@/features/checkin/services/scanner-result.service';
import { getErrorMessage } from '@/lib/errors';

const SCAN_COOLDOWN_MS = 5000;

type UseScannerControllerArgs = {
  isOnline: boolean;
  session: CurrentScanSession | null;
  userId: string | null | undefined;
};

export function useScannerController({ isOnline, session, userId }: UseScannerControllerArgs) {
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [lastScanData, setLastScanData] = useState<string | null>(null);
  const [recentHistory, setRecentHistory] = useState<RecentScanHistoryItem[]>([]);
  const [resultState, setResultState] = useState<LiveResultState>(createIdleResultState);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandledScanRef = useRef<{ at: number; value: string } | null>(null);

  const topStatus = useMemo(
    () => (isOnline ? { label: 'Online', tone: 'success' as const } : { label: 'Offline', tone: 'warning' as const }),
    [isOnline],
  );

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
      if (!isOnline || !session || !userId || isSyncingPending) {
        return;
      }

      const queue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);

      if (queue.length === 0) {
        setPendingCount(0);
        return;
      }

      setIsSyncingPending(true);

      try {
        const outcome = await syncPendingQueue(session, queue);

        if (!outcome.success) {
          setResultState({
            status: 'ERROR',
            tone: 'danger',
            title: 'Offline sync failed',
            description: outcome.errorCount > 0
              ? 'The server could not safely reconcile this offline batch. Keep the device signed in and retry later.'
              : 'Unable to sync offline scans right now. Please retry when the connection is stable.',
            gateAction: 'Keep queue on device',
            guestLabel: 'Sync pending',
            icon: 'cloud-alert-outline',
            panelVariant: 'danger',
          });
          const remainingQueue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);
          setPendingCount(remainingQueue.length);
          return;
        }

        if (outcome.processedIds.length > 0) {
          await pendingSyncStorage.removeMany(outcome.processedIds);
        }

        setSyncedCount((count) => count + outcome.syncedCount);
        setDuplicateCount((count) => count + outcome.conflictCount);

        for (const item of outcome.historyItems) {
          await recentScanHistoryStorage.push(item);
        }

        await refreshOfflinePanels(session.concertId, session.gateNumber);

        if (outcome.syncedCount > 0 || outcome.conflictCount > 0) {
          setResultState({
            status: outcome.conflictCount > 0 ? 'OFFLINE' : 'IDLE',
            tone: outcome.conflictCount > 0 ? 'warning' : 'success',
            title: outcome.conflictCount > 0 ? 'Sync completed with conflicts' : 'Offline queue synced',
            description: outcome.conflictCount > 0
              ? `${outcome.syncedCount} ticket(s) synced, ${outcome.conflictCount} conflict(s) kept in history.`
              : `${outcome.syncedCount} offline ticket(s) synced to the server.`,
            gateAction: outcome.conflictCount > 0 ? 'Review recent scans' : 'Continue scanning',
            guestLabel: 'Queue updated',
            icon: outcome.conflictCount > 0 ? 'alert-circle-outline' : 'cloud-check-outline',
            panelVariant: outcome.conflictCount > 0 ? 'default' : 'elevated',
          });
        }
      } catch {
        const remainingQueue = await pendingSyncStorage.getQueueForSession(session.concertId, session.gateNumber);
        setPendingCount(remainingQueue.length);
        setResultState({
          status: 'ERROR',
          tone: 'danger',
          title: 'Offline sync failed',
          description: 'Unable to sync offline scans right now. Please retry when the connection is stable.',
          gateAction: 'Keep queue on device',
          guestLabel: 'Sync pending',
          icon: 'cloud-alert-outline',
          panelVariant: 'danger',
        });
      } finally {
        setIsSyncingPending(false);
      }
    }

    void syncPendingScans();
  }, [isOnline, isSyncingPending, session, userId]);

  const unlockScannerSoon = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setIsProcessingScan(false);
    }, SCAN_COOLDOWN_MS);
  };

  const applyCounterDelta = (delta: { accepted: number; duplicate: number; scanned: number; synced: number }) => {
    setScannedCount((count) => count + delta.scanned);
    setAcceptedCount((count) => count + delta.accepted);
    setSyncedCount((count) => count + delta.synced);
    setDuplicateCount((count) => count + delta.duplicate);
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

  const resetScanner = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setIsProcessingScan(false);
    setLastScanData(null);
    setResultState(createIdleResultState());
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
    setLastScanData(trimmedData);

    if (!isOnline) {
      try {
        if (!userId) {
          return;
        }

        const outcome = await processOfflineScan(trimmedData, session, userId, {
          getPrefetchedSet: () => prefetchStorage.getPrefetchedTicketSet(),
          hasLocalHash: (concertId, gateNumber, qrCodeHash) => localScanStorage.hasHash(concertId, gateNumber, qrCodeHash),
          getQueuedItems: (concertId, gateNumber) => pendingSyncStorage.getQueueForSession(concertId, gateNumber),
        });

        applyCounterDelta(outcome.counterDelta);
        setResultState(outcome.resultState);

        if (outcome.shouldPersistLocalHash) {
          await localScanStorage.addHash(session.concertId, session.gateNumber, trimmedData);
        }

        if (outcome.pendingItem) {
          await pendingSyncStorage.enqueue(outcome.pendingItem);
        }

        if (outcome.historyItem) {
          await pushHistoryItem(outcome.historyItem);
        }

        if (outcome.pendingItem) {
          await refreshOfflinePanels(session.concertId, session.gateNumber);
        }

        await Haptics.notificationAsync(
          outcome.resultState.tone === 'success'
            ? Haptics.NotificationFeedbackType.Success
            : outcome.resultState.tone === 'warning'
              ? Haptics.NotificationFeedbackType.Warning
              : Haptics.NotificationFeedbackType.Error,
        );
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

      const feedback = createOnlineScanFeedback(trimmedData, response, session);
      applyCounterDelta(feedback.counterDelta);
      setResultState(feedback.resultState);

      if (response.status === 'ACCEPTED') {
        await localScanStorage.addHash(session.concertId, session.gateNumber, trimmedData);
      }

      if (feedback.historyItem) {
        await pushHistoryItem(feedback.historyItem);
      }

      await Haptics.notificationAsync(
        feedback.resultState.tone === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : feedback.resultState.tone === 'warning'
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Error,
      );
    } catch (error) {
      setResultState(createErrorResultState(trimmedData, getErrorMessage(error, 'Unable to validate this ticket right now.')));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      unlockScannerSoon();
    }
  };

  return {
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
  };
}
