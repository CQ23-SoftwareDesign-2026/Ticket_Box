import type { Href } from 'expo-router';

export const routes = {
  login: '/login' as Href,
  pendingApproval: '/pending-approval' as Href,
  staffHome: '/staff' as Href,
  staffSessionSetup: '/staff/session-setup' as Href,
  staffProfile: '/staff/profile' as Href,
  staffScanner: '/staff/scanner' as Href,
} as const;
