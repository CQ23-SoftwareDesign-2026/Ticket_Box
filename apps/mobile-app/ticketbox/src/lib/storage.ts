import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants/app-config';
import type { ScanTicketStatus } from '@/features/checkin/types/checkin.types';

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type CurrentScanSession = {
  concertId: string;
  concertTitle: string;
  concertVenue: string;
  gateNumber: number;
  gateLabel: string;
  prefetchedHashCount: number;
  prefetchedAt: string;
};

export type PrefetchedTicketSet = {
  concertId: string;
  gateNumber: number;
  hashes: string[];
  prefetchedAt: string;
};

export type PendingSyncScan = {
  id: string;
  concertId: string;
  gateNumber: number;
  qrCodeHash: string;
  scannedAt: string;
  scannedBy: string;
};

export type RecentScanHistoryItem = {
  id: string;
  concertId: string;
  gateNumber: number;
  qrCodeHash: string;
  scannedAt: string;
  status: ScanTicketStatus | 'OFFLINE_ACCEPTED' | 'SYNCED';
  title: string;
  detail: string;
};

type LocalScannedBuckets = Record<string, string[]>;

const RECENT_SCAN_HISTORY_LIMIT = 12;

function buildSessionKey(concertId: string, gateNumber: number) {
  return `${concertId}:${gateNumber}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    await AsyncStorage.removeItem(key);
    return fallback;
  }
}

export const tokenStorage = {
  async getTokens(): Promise<StoredTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.accessToken),
      AsyncStorage.getItem(STORAGE_KEYS.refreshToken),
    ]);

    return { accessToken, refreshToken };
  },

  async setTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.accessToken, accessToken),
      AsyncStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken),
    ]);
  },

  async clearTokens() {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.accessToken),
      AsyncStorage.removeItem(STORAGE_KEYS.refreshToken),
    ]);
  },
};

export const scanSessionStorage = {
  async getCurrentSession(): Promise<CurrentScanSession | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.currentScanSession);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as CurrentScanSession;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEYS.currentScanSession);
      return null;
    }
  },

  async setCurrentSession(session: CurrentScanSession) {
    await AsyncStorage.setItem(STORAGE_KEYS.currentScanSession, JSON.stringify(session));
  },

  async clearCurrentSession() {
    await AsyncStorage.removeItem(STORAGE_KEYS.currentScanSession);
  },
};

export const prefetchStorage = {
  async getPrefetchedTicketSet(): Promise<PrefetchedTicketSet | null> {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.prefetchedTicketSet);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PrefetchedTicketSet;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEYS.prefetchedTicketSet);
      return null;
    }
  },

  async setPrefetchedTicketSet(payload: PrefetchedTicketSet) {
    await AsyncStorage.setItem(STORAGE_KEYS.prefetchedTicketSet, JSON.stringify(payload));
  },

  async clearPrefetchedTicketSet() {
    await AsyncStorage.removeItem(STORAGE_KEYS.prefetchedTicketSet);
  },
};

export const localScanStorage = {
  buildSessionKey,

  async getHashes(concertId: string, gateNumber: number) {
    const buckets = await readJson<LocalScannedBuckets>(STORAGE_KEYS.localScannedBuckets, {});
    return buckets[buildSessionKey(concertId, gateNumber)] ?? [];
  },

  async hasHash(concertId: string, gateNumber: number, qrCodeHash: string) {
    const hashes = await this.getHashes(concertId, gateNumber);
    return hashes.includes(qrCodeHash);
  },

  async addHash(concertId: string, gateNumber: number, qrCodeHash: string) {
    const buckets = await readJson<LocalScannedBuckets>(STORAGE_KEYS.localScannedBuckets, {});
    const sessionKey = buildSessionKey(concertId, gateNumber);
    const current = buckets[sessionKey] ?? [];

    if (current.includes(qrCodeHash)) {
      return current.length;
    }

    const next = [...current, qrCodeHash];
    buckets[sessionKey] = next;
    await AsyncStorage.setItem(STORAGE_KEYS.localScannedBuckets, JSON.stringify(buckets));
    return next.length;
  },

  async clearAll() {
    await AsyncStorage.removeItem(STORAGE_KEYS.localScannedBuckets);
  },
};

export const pendingSyncStorage = {
  async getQueue(): Promise<PendingSyncScan[]> {
    return readJson<PendingSyncScan[]>(STORAGE_KEYS.pendingSyncQueue, []);
  },

  async getQueueForSession(concertId: string, gateNumber: number) {
    const queue = await this.getQueue();
    return queue.filter((item) => item.concertId === concertId && item.gateNumber === gateNumber);
  },

  async enqueue(scan: PendingSyncScan) {
    const queue = await this.getQueue();
    const exists = queue.some(
      (item) =>
        item.concertId === scan.concertId &&
        item.gateNumber === scan.gateNumber &&
        item.qrCodeHash === scan.qrCodeHash,
    );

    if (exists) {
      return queue.length;
    }

    const nextQueue = [...queue, scan];
    await AsyncStorage.setItem(STORAGE_KEYS.pendingSyncQueue, JSON.stringify(nextQueue));
    return nextQueue.length;
  },

  async removeMany(ids: string[]) {
    if (ids.length === 0) {
      return 0;
    }

    const idSet = new Set(ids);
    const queue = await this.getQueue();
    const nextQueue = queue.filter((item) => !idSet.has(item.id));
    await AsyncStorage.setItem(STORAGE_KEYS.pendingSyncQueue, JSON.stringify(nextQueue));
    return nextQueue.length;
  },

  async clearAll() {
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingSyncQueue);
  },
};

export const recentScanHistoryStorage = {
  async getHistory(): Promise<RecentScanHistoryItem[]> {
    return readJson<RecentScanHistoryItem[]>(STORAGE_KEYS.recentScanHistory, []);
  },

  async getHistoryForSession(concertId: string, gateNumber: number) {
    const items = await this.getHistory();
    return items.filter((item) => item.concertId === concertId && item.gateNumber === gateNumber);
  },

  async push(item: RecentScanHistoryItem) {
    const items = await this.getHistory();
    const nextItems = [item, ...items].slice(0, RECENT_SCAN_HISTORY_LIMIT);
    await AsyncStorage.setItem(STORAGE_KEYS.recentScanHistory, JSON.stringify(nextItems));
    return nextItems;
  },

  async clearAll() {
    await AsyncStorage.removeItem(STORAGE_KEYS.recentScanHistory);
  },
};
