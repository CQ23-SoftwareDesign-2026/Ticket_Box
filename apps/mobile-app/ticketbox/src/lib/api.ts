import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { APP_CONFIG } from '@/constants/app-config';
import type { User } from '@/features/auth/types/auth.types';
import {
  getAccessToken,
  getRefreshToken,
  handleSessionUser,
  handleUnauthorized,
  setSessionTokens,
} from '@/lib/session';
import { tokenStorage } from '@/lib/storage';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

const authClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string> | null = null;

function shouldSkipRefresh(config?: RetryableRequestConfig) {
  if (!config) {
    return true;
  }

  const requestUrl = config.url ?? '';
  const publicAuthPaths = [
    '/auth/login',
    '/auth/refresh',
  ];

  return publicAuthPaths.some((path) => requestUrl.includes(path));
}

async function refreshAccessToken() {
  const storedRefreshToken = getRefreshToken();

  if (!storedRefreshToken) {
    throw new Error('Missing refresh token');
  }

  const { data } = await axios.post<RefreshResponse>(
    `${APP_CONFIG.apiBaseUrl}/auth/refresh`,
    { refreshToken: storedRefreshToken },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  setSessionTokens(data.accessToken, data.refreshToken);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  handleSessionUser(data.user);

  return data.accessToken;
}

authClient.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      shouldSkipRefresh(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken();
      const newAccessToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return await authClient(originalRequest);
    } catch (refreshError) {
      setSessionTokens(null, null);
      await tokenStorage.clearTokens();
      await handleUnauthorized();
      return Promise.reject(refreshError);
    } finally {
      refreshPromise = null;
    }
  },
);

export function setApiAccessToken(token: string | null) {
  if (token) {
    authClient.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete authClient.defaults.headers.common.Authorization;
}

export const apiClient: AxiosInstance = authClient;
