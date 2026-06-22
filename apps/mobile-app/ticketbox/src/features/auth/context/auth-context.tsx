import {
  createContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { authApi } from '@/features/auth/api/auth-api';
import type {
  AuthResponse,
  User,
} from '@/features/auth/types/auth.types';
import { resolveAuthRoute } from '@/features/auth/utils/resolve-auth-route';
import { setApiAccessToken } from '@/lib/api';
import { routes } from '@/lib/routes';
import { registerSessionUserHandler, registerUnauthorizedHandler, setSessionTokens } from '@/lib/session';
import { prefetchStorage, scanSessionStorage, tokenStorage } from '@/lib/storage';

export type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  initialRoute: typeof routes.login | typeof routes.pendingApproval | typeof routes.staffHome;
  login: (email: string, password: string) => Promise<typeof routes.pendingApproval | typeof routes.staffHome>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applySession = async (payload: AuthResponse) => {
    setSessionTokens(payload.accessToken, payload.refreshToken);
    setApiAccessToken(payload.accessToken);
    await tokenStorage.setTokens(payload.accessToken, payload.refreshToken);
    setUser(payload.user);
  };

  const clearSession = async () => {
    setSessionTokens(null, null);
    setApiAccessToken(null);
    await Promise.all([
      tokenStorage.clearTokens(),
      scanSessionStorage.clearCurrentSession(),
      prefetchStorage.clearPrefetchedTicketSet(),
    ]);
    setUser(null);
  };

  useEffect(() => {
    registerUnauthorizedHandler(async () => {
      await clearSession();
    });
    registerSessionUserHandler((nextUser) => {
      setUser(nextUser as User);
    });

    return () => {
      registerUnauthorizedHandler(null);
      registerSessionUserHandler(null);
    };
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        const stored = await tokenStorage.getTokens();

        if (!stored.accessToken || !stored.refreshToken) {
          await clearSession();
          return;
        }

        setSessionTokens(stored.accessToken, stored.refreshToken);
        setApiAccessToken(stored.accessToken);

        const profile = await authApi.me();
        setUser(profile);
      } catch {
        await clearSession();
      } finally {
        setIsBootstrapping(false);
      }
    }

    bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      isSubmitting,
      initialRoute: resolveAuthRoute(user),
      async login(email, password) {
        setIsSubmitting(true);
        try {
          const response = await authApi.login(email, password);
          await applySession(response);
          return resolveAuthRoute(response.user) as typeof routes.pendingApproval | typeof routes.staffHome;
        } finally {
          setIsSubmitting(false);
        }
      },
      async logout() {
        setIsSubmitting(true);
        try {
          await authApi.logout();
        } catch {
          // Ignore logout API failures and clear the local session anyway.
        } finally {
          await clearSession();
          setIsSubmitting(false);
        }
      },
    }),
    [isBootstrapping, isSubmitting, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
