import { Redirect } from 'expo-router';

import { useAuth } from '@/features/auth/hooks/use-auth';

export default function IndexScreen() {
  const { initialRoute } = useAuth();

  return <Redirect href={initialRoute} />;
}
