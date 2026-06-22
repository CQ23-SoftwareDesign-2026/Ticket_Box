import { tokenStorage } from "@/utils/token.utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/proxy";

type ApiErrorBody = {
  message?: string;
  [key: string]: unknown;
};

class FetchError extends Error {
  public response: { data: ApiErrorBody; status: number; statusText: string };

  constructor(message: string, response: Response, data: ApiErrorBody) {
    super(message);
    this.name = "FetchError";
    this.response = {
      data,
      status: response.status,
      statusText: response.statusText,
    };
  }
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export async function fetchClient<T>(
  endpoint: string,
  options: RequestInit = {},
  _retry = false,
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = tokenStorage.getAccessToken();

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: ApiErrorBody;
      try {
        errorData = (await response.json()) as ApiErrorBody;
      } catch {
        errorData = { message: response.statusText };
      }

      // Handle 401 Unauthorized
      if (response.status === 401) {
        const isRefreshRequest = endpoint.includes("/auth/refresh");
        const isLoginRequest = endpoint.includes("/auth/login");

        if (isRefreshRequest || isLoginRequest || _retry) {
          tokenStorage.clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new FetchError("Unauthorized", response, errorData);
        }

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const refreshToken = tokenStorage.getRefreshToken();
            if (!refreshToken) {
              throw new Error("No refresh token available");
            }

            const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResp.ok) {
              const refreshData = await refreshResp.json();
              tokenStorage.setTokens(
                refreshData.accessToken,
                refreshData.refreshToken,
              );
              processQueue(null, refreshData.accessToken);
            } else {
              throw new Error("Invalid refresh response");
            }
          } catch (err) {
            tokenStorage.clearTokens();
            processQueue(err, null);
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            throw err;
          } finally {
            isRefreshing = false;
          }
        }

        // Wait for the token refresh to complete
        return new Promise<T>((resolve, reject) => {
          failedQueue.push({
            resolve: resolve as (value?: unknown) => void,
            reject,
          });
        })
          .then((newToken) => {
            const t = newToken as string | null;
            if (t) {
              const newHeaders = new Headers(config.headers);
              newHeaders.set("Authorization", `Bearer ${t}`);
              return fetchClient<T>(
                endpoint,
                { ...config, headers: newHeaders },
                true,
              );
            }
            throw new FetchError("Unauthorized", response, errorData);
          })
          .catch((err) => {
            throw err;
          });
      }

      // Handle 403 Forbidden
      if (response.status === 403) {
        console.error("Access forbidden:", errorData);
        if (typeof window !== "undefined") {
          window.location.href = "/access-denied";
        }
        throw new FetchError("Forbidden", response, errorData);
      }

      throw new FetchError(
        errorData.message || "Fetch failed",
        response,
        errorData,
      );
    }

    // Return parsed JSON if successful
    if (response.status === 204) {
      return {} as T;
    }

    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  } catch (error) {
    if (error instanceof FetchError) {
      throw error;
    }
    throw error;
  }
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchClient<T>(endpoint, { ...options, method: "GET" }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    fetchClient<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchClient<T>(endpoint, { ...options, method: "DELETE" }),
};

export default apiClient;
