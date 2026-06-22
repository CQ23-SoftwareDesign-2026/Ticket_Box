import { useEffect, useState } from 'react';

import { scanSessionStorage, type CurrentScanSession } from '@/lib/storage';

export function useCurrentScanSession() {
  const [session, setSession] = useState<CurrentScanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const stored = await scanSessionStorage.getCurrentSession();
        setSession(stored);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  return {
    session,
    isLoading,
    setSession,
  };
}
