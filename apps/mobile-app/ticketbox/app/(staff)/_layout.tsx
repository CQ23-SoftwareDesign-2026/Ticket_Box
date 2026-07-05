import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { canAccessStaffApp } from '@/features/auth/utils/access-policy';
import { routes } from '@/lib/routes';

export default function StaffLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href={routes.login} />;
  }

  if (!user || !canAccessStaffApp(user.roles)) {
    return <Redirect href={routes.pendingApproval} />;
  }

  return <Slot />;
}
