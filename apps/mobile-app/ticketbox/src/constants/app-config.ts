export const APP_CONFIG = {
  appName: 'TicketBox Staff',
  apiBaseUrl: 'https://api.ticketbox.retrobit.io.vn',
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
