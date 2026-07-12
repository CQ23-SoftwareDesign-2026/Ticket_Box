"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "@/types/auth.types";
import { authService } from "@/services/auth.service";
import { tokenStorage, isTokenExpired } from "@/utils/token.utils";

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserProfile) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = tokenStorage.getAccessToken();
        if (token) {
          // Proactively refresh token if expired before requesting /me profile
          if (isTokenExpired(token)) {
            const refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken) {
              await authService.refreshToken();
            } else {
              throw new Error("No refresh token available");
            }
          }
          const profile = await authService.me();
          setUser(profile);
        }
      } catch (error) {
        console.error("Failed to restore session:", error);
        tokenStorage.clearTokens();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (userData: UserProfile) => {
    setUser(userData);
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
