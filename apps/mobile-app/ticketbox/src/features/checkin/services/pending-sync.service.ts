import { checkinApi } from '@/features/checkin/api/checkin-api';
import type {
  CurrentScanSession,
  PendingSyncScan,
  RecentScanHistoryItem,
} from '@/features/checkin/storage/checkin-storage';
import { shortenQrValue } from '@/features/checkin/utils/checkin-formatters';

export type PendingSyncOutcome = {
  conflictCount: number;
  errorCount: number;
  historyItems: RecentScanHistoryItem[];
  processedIds: string[];
  success: boolean;
  syncedCount: number;
};

function buildSyncCandidates(queue: PendingSyncScan[]) {
  const sortedQueue = [...queue].sort((a, b) => a.qrCodeHash.localeCompare(b.qrCodeHash));
  const uniqueQueueMap = new Map<string, PendingSyncScan>();

  for (const item of sortedQueue) {
    const existing = uniqueQueueMap.get(item.qrCodeHash);

    if (!existing || new Date(item.scannedAt) < new Date(existing.scannedAt)) {
      uniqueQueueMap.set(item.qrCodeHash, item);
    }
  }

  return Array.from(uniqueQueueMap.values());
}

export async function syncPendingQueue(
  session: CurrentScanSession,
  queue: PendingSyncScan[],
): Promise<PendingSyncOutcome> {
  if (queue.length === 0) {
    return {
      conflictCount: 0,
      errorCount: 0,
      historyItems: [],
      processedIds: [],
      success: true,
      syncedCount: 0,
    };
  }

  const syncCandidates = buildSyncCandidates(queue);

  const response = await checkinApi.syncTickets({
    concert_id: session.concertId,
    gate_id: session.gateNumber,
    updates: queue.map((item) => ({
      qr_code_hash: item.qrCodeHash,
      scanned_at: item.scannedAt,
    })),
  });

  if (!response.success || response.errors > 0) {
    return {
      syncedCount: 0,
      conflictCount: 0,
      errorCount: response.errors,
      processedIds: [],
      historyItems: [],
      success: false,
    };
  }

  const updatedCount = Math.min(response.updated, syncCandidates.length);
  const conflictCount = Math.min(response.conflicts, Math.max(syncCandidates.length - updatedCount, 0));
  const successItems = syncCandidates.slice(0, updatedCount);
  const conflictItems = syncCandidates.slice(updatedCount, updatedCount + conflictCount);
  const processedItems = [...successItems, ...conflictItems];

  return {
    syncedCount: successItems.length,
    conflictCount: conflictItems.length,
    errorCount: 0,
    processedIds: processedItems.map((item) => item.id),
    success: true,
    historyItems: [
      ...successItems.map((item) => ({
        id: `${item.id}:synced`,
        concertId: item.concertId,
        gateNumber: item.gateNumber,
        qrCodeHash: item.qrCodeHash,
        scannedAt: new Date().toISOString(),
        status: 'SYNCED' as const,
        title: 'Offline scan synced',
        detail: `${shortenQrValue(item.qrCodeHash)} was uploaded to server successfully.`,
      })),
      ...conflictItems.map((item) => ({
        id: `${item.id}:conflict`,
        concertId: item.concertId,
        gateNumber: item.gateNumber,
        qrCodeHash: item.qrCodeHash,
        scannedAt: new Date().toISOString(),
        status: 'SYNC_CONFLICT' as const,
        title: 'Sync conflict',
        detail: `${shortenQrValue(item.qrCodeHash)} was already scanned before this device synced.`,
      })),
    ],
  };
}
