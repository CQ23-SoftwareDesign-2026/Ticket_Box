import type { ApiErrorResponse } from "@/types/auth.types";

/**
 * API error handling utilities
 */

interface FetchErrorLike extends Error {
  response?: {
    status?: number;
    data?: ApiErrorResponse;
  };
}

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    const fetchError = error as FetchErrorLike;
    if (fetchError.response?.data?.message) {
      return fetchError.response.data.message;
    }

    if (
      error.message === "Network Error" ||
      error.message === "Failed to fetch"
    ) {
      return "Network error. Please check your connection.";
    }
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message === "Failed to fetch" || error.message === "Network Error"
    );
  }
  return false;
};

/**
 * Check if error is authentication related
 */
export const isAuthError = (error: unknown): boolean => {
  const fetchError = error as FetchErrorLike;
  return (
    fetchError.response?.status === 401 || fetchError.response?.status === 403
  );
};

/**
 * Check if error is server error (5xx)
 */
export const isServerError = (error: unknown): boolean => {
  const fetchError = error as FetchErrorLike;
  return (fetchError.response?.status ?? 0) >= 500;
};

/**
 * Check if error is client error (4xx, not auth)
 */
export const isClientError = (error: unknown): boolean => {
  const fetchError = error as FetchErrorLike;
  const status = fetchError.response?.status ?? 0;
  return status >= 400 && status < 500 && status !== 401 && status !== 403;
};
