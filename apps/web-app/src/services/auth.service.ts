import apiClient from "./api";
import type {
  AuthResponse,
  MessageResponse,
  RegisterResponse,
  UserProfile,
} from "@/types/auth.types";
import { tokenStorage } from "@/utils/token.utils";

/**
 * Authentication service
 * Handles login, registration, and token refresh
 */

export const authService = {
  /**
   * Login with email and password
   */
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await apiClient.post<AuthResponse>("/auth/login", {
        email,
        password,
      });

      if (response) {
        tokenStorage.setTokens(response.accessToken, response.refreshToken);
      }

      return response;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  },

  /**
   * Register new user
   */
  register: async (
    email: string,
    password: string,
    fullName: string,
  ): Promise<RegisterResponse> => {
    try {
      const response = await apiClient.post<RegisterResponse>(
        "/auth/register",
        {
          email,
          password,
          fullName,
        },
      );

      return response;
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  },

  /**
   * Logout - invalidate refresh token on server and clear local tokens
   */
  logout: async (): Promise<void> => {
    try {
      await apiClient.post<MessageResponse>("/auth/logout");
    } catch {
      // ignore
    } finally {
      tokenStorage.clearTokens();
    }
  },

  /**
   * Resend email verification
   */
  resendVerification: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(
      "/auth/resend-verification",
      { email },
    );
    return response;
  },

  /**
   * Restore session on reload (F5)
   */
  me: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>("/auth/me");
    return response;
  },

  /**
   * Change password
   */
  changePassword: async (
    oldPassword: string,
    newPassword: string,
  ): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(
      "/auth/change-password",
      { oldPassword, newPassword },
    );
    return response;
  },

  /**
   * Forgot password
   */
  forgotPassword: async (email: string): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(
      "/auth/forgot-password",
      { email },
    );
    return response;
  },

  /**
   * Reset password
   */
  resetPassword: async (
    token: string,
    newPassword: string,
  ): Promise<MessageResponse> => {
    const response = await apiClient.post<MessageResponse>(
      "/auth/reset-password",
      { token, newPassword },
    );
    return response;
  },

  /**
   * Refresh access token
   */
  refreshToken: async (): Promise<string> => {
    try {
      const refreshToken = tokenStorage.getRefreshToken();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await apiClient.post<AuthResponse>("/auth/refresh", {
        refreshToken,
      });

      if (response) {
        tokenStorage.setTokens(response.accessToken, response.refreshToken);
        return response.accessToken;
      }

      throw new Error("Failed to refresh token");
    } catch (error) {
      console.error("Token refresh failed:", error);
      tokenStorage.clearTokens();
      throw error;
    }
  },

  /**
   * Verify token is valid
   */
  verifyToken: (): boolean => {
    return tokenStorage.hasToken();
  },
};
