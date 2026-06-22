"use client";

import { useEffect, useState, useCallback } from "react";
import { tokenStorage, isTokenExpired } from "@/utils/token.utils";
import type { UserProfile } from "@/types/auth.types";
import { authService } from "@/services/auth.service";

/**
 * Custom hook for authentication
 * Provides auth state and user information
 */

interface UseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

export const useAuth = (): UseAuthReturn => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        const token = tokenStorage.getAccessToken();
        if (!token) {
          tokenStorage.clearTokens();
          if (mounted) {
            setIsAuthenticated(false);
            setUser(null);
          }
          return;
        }

        if (isTokenExpired(token) && tokenStorage.getRefreshToken()) {
          await authService.refreshToken();
        }

        const profile = await authService.me();
        if (mounted) {
          setUser(profile);
          setIsAuthenticated(true);
        }
      } catch {
        tokenStorage.clearTokens();
        if (mounted) {
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  const logout = useCallback((): void => {
    tokenStorage.clearTokens();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user || !user.permissions) {
        return false;
      }
      return user.permissions.includes(permission);
    },
    [user],
  );

  return {
    isAuthenticated,
    isLoading,
    user,
    logout,
    hasPermission,
  };
};
