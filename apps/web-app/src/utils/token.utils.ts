import type { TokenPayload } from "@/types/auth.types";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/**
 * Storage utility functions for token management
 * Uses localStorage for JWT token persistence
 */

export const tokenStorage = {
  /**
   * Get access token from localStorage
   */
  getAccessToken: (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken: (): string | null => {
    if (typeof window === "undefined") {
      return null;
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Set both access and refresh tokens in localStorage
   */
  setTokens: (accessToken: string, refreshToken: string): void => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Set access token in localStorage
   */
  setAccessToken: (token: string): void => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  /**
   * Clear all tokens from localStorage
   */
  clearTokens: (): void => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if token exists
   */
  hasToken: (): boolean => {
    if (typeof window === "undefined") {
      return false;
    }
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  },
};

/**
 * Decode JWT token to get payload
 * Note: This is a basic implementation for demo purposes
 * In production, validate the signature on the backend
 */
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // JWT uses base64url encoding
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json =
      typeof window !== "undefined"
        ? decodeURIComponent(
            atob(padded)
              .split("")
              .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
              .join(""),
          )
        : Buffer.from(padded, "base64").toString("utf-8");

    const decoded = JSON.parse(json);
    return decoded as TokenPayload;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const expirationTime = payload.exp * 1000; // Convert to milliseconds
  return Date.now() >= expirationTime;
};
