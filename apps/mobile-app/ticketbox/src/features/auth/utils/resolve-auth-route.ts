import type { User } from '@/features/auth/types/auth.types';
import { isAudienceOnly, isCheckerOrAdmin } from '@/features/auth/utils/role-helpers';
import { routes } from '@/lib/routes';

export function resolveAuthRoute(user: User | null) {
  if (!user) {
    return routes.login;
  }

  if (isCheckerOrAdmin(user.roles)) {
    return routes.staffHome;
  }

  if (isAudienceOnly(user.roles)) {
    return routes.pendingApproval;
  }

  return routes.login;
}
