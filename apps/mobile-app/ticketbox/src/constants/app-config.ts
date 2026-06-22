export const APP_CONFIG = {
  appName: 'TicketBox Staff',
  apiBaseUrl: 'https://api.ticketbox.retrobit.io.vn',
};

export const STORAGE_KEYS = {
  accessToken: 'ticketbox.staff.accessToken',
  refreshToken: 'ticketbox.staff.refreshToken',
  currentScanSession: 'ticketbox.staff.currentScanSession',
  prefetchedTicketSet: 'ticketbox.staff.prefetchedTicketSet',
} as const;
