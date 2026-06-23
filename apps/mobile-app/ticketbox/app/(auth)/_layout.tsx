import { Redirect, Slot } from 'expo-router';

import { useAuth } from '@/features/auth/hooks/use-auth';

export default function AuthLayout() {
  const { isAuthenticated, initialRoute } = useAuth();

  if (isAuthenticated) {
    return <Redirect href={initialRoute} />;
  }

  return <Slot />;
}
