const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error(
    'Missing EXPO_PUBLIC_API_BASE_URL. Set it in apps/mobile-app/ticketbox/.env before starting the app.',
  );
}

export const APP_CONFIG = {
  appName: 'TicketBox Staff',
  apiBaseUrl,
};

export const STORAGE_KEYS = {
  accessToken: 'ticketbox.staff.accessToken',
  refreshToken: 'ticketbox.staff.refreshToken',
  currentScanSession: 'ticketbox.staff.currentScanSession',
  prefetchedTicketSet: 'ticketbox.staff.prefetchedTicketSet',
  localScannedBuckets: 'ticketbox.staff.localScannedBuckets',
  pendingSyncQueue: 'ticketbox.staff.pendingSyncQueue',
  recentScanHistory: 'ticketbox.staff.recentScanHistory',
} as const;
