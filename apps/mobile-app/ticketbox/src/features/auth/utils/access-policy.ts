import type { User } from '@/features/auth/types/auth.types';
import { routes } from '@/lib/routes';

export function isAudienceOnly(roles: string[] = []) {
  return roles.length > 0 && roles.every((role) => role === 'Audience');
}

export function canAccessStaffApp(roles: string[] = []) {
  return roles.some((role) => role === 'Checker' || role === 'Admin');
}

export function resolveAuthRoute(user: User | null) {
  if (!user) {
    return routes.login;
  }

  if (canAccessStaffApp(user.roles)) {
    return routes.staffHome;
  }

  if (isAudienceOnly(user.roles)) {
    return routes.pendingApproval;
  }

  return routes.login;
}
