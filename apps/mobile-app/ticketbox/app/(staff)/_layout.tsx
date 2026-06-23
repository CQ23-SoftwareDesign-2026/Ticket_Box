import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { isCheckerOrAdmin } from '@/features/auth/utils/role-helpers';
import { routes } from '@/lib/routes';

export default function StaffLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href={routes.login} />;
  }

  if (!user || !isCheckerOrAdmin(user.roles)) {
    return <Redirect href={routes.pendingApproval} />;
  }

  return <Slot />;
}
