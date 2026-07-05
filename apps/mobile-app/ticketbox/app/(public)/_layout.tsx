import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { isAudienceOnly } from '@/features/auth/utils/access-policy';
import { routes } from '@/lib/routes';

export default function PublicLayout() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect href={routes.login} />;
  }

  if (!user || !isAudienceOnly(user.roles)) {
    return <Redirect href={routes.staffHome} />;
  }

  return <Slot />;
}
