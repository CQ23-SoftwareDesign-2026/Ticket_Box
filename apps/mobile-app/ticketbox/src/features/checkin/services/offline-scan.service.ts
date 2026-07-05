import type {
  CurrentScanSession,
  PendingSyncScan,
  RecentScanHistoryItem,
} from '@/features/checkin/storage/checkin-storage';
import { shortenQrValue } from '@/features/checkin/utils/checkin-formatters';
import { isPrefetchExpired } from '@/features/checkin/utils/session-validity';
import type { LiveResultState } from '@/features/checkin/services/scanner-result.service';

export type OfflineScanDependencies = {
  getPrefetchedSet: () => Promise<{ concertId: string; gateNumber: number; hashes: string[] } | null>;
  hasLocalHash: (concertId: string, gateNumber: number, qrCodeHash: string) => Promise<boolean>;
  getQueuedItems: (concertId: string, gateNumber: number) => Promise<PendingSyncScan[]>;
};

export type OfflineScanOutcome = {
  counterDelta: {
    accepted: number;
    duplicate: number;
    scanned: number;
    synced: number;
  };
  historyItem?: RecentScanHistoryItem;
  pendingItem?: PendingSyncScan;
  resultState: LiveResultState;
  shouldPersistLocalHash: boolean;
};

export async function processOfflineScan(
  qrValue: string,
  session: CurrentScanSession,
  userId: string,
  deps: OfflineScanDependencies,
): Promise<OfflineScanOutcome> {
  const [prefetchedSet, isLocallyScanned, queuedItems] = await Promise.all([
    deps.getPrefetchedSet(),
    deps.hasLocalHash(session.concertId, session.gateNumber, qrValue),
    deps.getQueuedItems(session.concertId, session.gateNumber),
  ]);

  const historyBase = {
    concertId: session.concertId,
    gateNumber: session.gateNumber,
    qrCodeHash: qrValue,
  };

  const matchesActiveSession =
    prefetchedSet &&
    prefetchedSet.concertId === session.concertId &&
    prefetchedSet.gateNumber === session.gateNumber;

  if (!matchesActiveSession) {
    return {
      counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
      resultState: {
        status: 'OFFLINE',
        tone: 'warning',
        title: 'Prefetch expired for this session',
        description: 'Refresh this session online before using offline scan.',
        gateAction: 'Return to setup',
        guestLabel: shortenQrValue(qrValue),
        icon: 'database-alert-outline',
        panelVariant: 'default',
      },
      shouldPersistLocalHash: false,
    };
  }

  if (isPrefetchExpired(prefetchedSet.prefetchedAt)) {
    return {
      counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
      resultState: {
        status: 'OFFLINE',
        tone: 'warning',
        title: 'Prefetch is out of date',
        description: 'Refresh the session online before relying on offline validation again.',
        gateAction: 'Refresh session',
        guestLabel: shortenQrValue(qrValue),
        icon: 'clock-alert-outline',
        panelVariant: 'default',
      },
      shouldPersistLocalHash: false,
    };
  }

  if (!prefetchedSet.hashes.includes(qrValue)) {
    return {
      counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 0 },
      resultState: {
        status: 'NOT_FOUND',
        tone: 'danger',
        title: 'Hash not in offline set',
        description: 'This QR code is not in the prefetched gate set.',
        gateAction: 'Reject entry',
        guestLabel: shortenQrValue(qrValue),
        icon: 'help-circle',
        panelVariant: 'danger',
      },
      historyItem: {
        ...historyBase,
        id: `offline-not-found:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
        scannedAt: new Date().toISOString(),
        status: 'NOT_FOUND',
        title: 'Offline hash missing',
        detail: `${shortenQrValue(qrValue)} is not in the prefetched hash set.`,
      },
      shouldPersistLocalHash: false,
    };
  }

  const isAlreadyQueued = queuedItems.some((item) => item.qrCodeHash === qrValue);

  if (isLocallyScanned || isAlreadyQueued) {
    return {
      counterDelta: { scanned: 1, accepted: 0, synced: 0, duplicate: 1 },
      resultState: {
        status: 'DUPLICATE',
        tone: 'warning',
        title: 'Already scanned on this device',
        description: 'This ticket was already accepted on this device.',
        gateAction: 'Verify attendee',
        guestLabel: shortenQrValue(qrValue),
        icon: 'alert-circle',
        panelVariant: 'default',
      },
      historyItem: {
        ...historyBase,
        id: `offline-duplicate:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
        scannedAt: new Date().toISOString(),
        status: 'DUPLICATE',
        title: 'Offline duplicate blocked',
        detail: `${shortenQrValue(qrValue)} was already accepted on this device.`,
      },
      shouldPersistLocalHash: false,
    };
  }

  const scannedAt = new Date().toISOString();
  const pendingItem: PendingSyncScan = {
    id: `pending:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
    concertId: session.concertId,
    gateNumber: session.gateNumber,
    qrCodeHash: qrValue,
    scannedAt,
    scannedBy: userId,
  };

  return {
    counterDelta: { scanned: 1, accepted: 1, synced: 0, duplicate: 0 },
    pendingItem,
    resultState: {
      status: 'OFFLINE',
      tone: 'success',
      title: 'Offline ticket accepted',
      description: 'Saved locally and will sync when the device is online.',
      gateAction: 'Allow entry',
      guestLabel: shortenQrValue(qrValue),
      icon: 'check-decagram',
      panelVariant: 'elevated',
    },
    historyItem: {
      ...historyBase,
      id: `offline-accepted:${session.concertId}:${session.gateNumber}:${qrValue}:${Date.now()}`,
      scannedAt,
      status: 'OFFLINE_ACCEPTED',
      title: 'Offline scan saved',
      detail: `${shortenQrValue(qrValue)} was accepted locally and queued for sync.`,
    },
    shouldPersistLocalHash: true,
  };
}
