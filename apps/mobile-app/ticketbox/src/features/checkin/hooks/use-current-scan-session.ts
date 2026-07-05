import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';

import { scanSessionStorage, type CurrentScanSession } from '@/features/checkin/storage/checkin-storage';

export function useCurrentScanSession() {
  const [session, setSession] = useState<CurrentScanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    async function loadSession() {
      setIsLoading(true);

      try {
        const stored = await scanSessionStorage.getCurrentSession();
        setSession(stored);
      } finally {
        setIsLoading(false);
      }
    }

    if (isFocused) {
      void loadSession();
    }
  }, [isFocused]);

  return {
    session,
    isLoading,
    setSession,
  };
}
