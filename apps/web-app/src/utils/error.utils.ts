import type { ApiErrorResponse } from "@/types/auth.types";

/**
 * API error handling utilities
 */

interface FetchErrorLike extends Error {
  response?: {
    status?: number;
    data?: ApiErrorResponse | { message?: string | string[] };
  };
}

type AuthErrorContext =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "resend-verification"
  | "verify-email";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";

function normalizeMessage(
  message: string | string[] | undefined,
): string | null {
  if (Array.isArray(message)) {
    return message.filter(Boolean).join(" ");
  }

  if (typeof message === "string" && message.trim().length > 0) {
    return message.trim();
  }

  return null;
}

export const getErrorStatus = (error: unknown): number | null => {
  const fetchError = error as FetchErrorLike;
  return fetchError.response?.status ?? null;
};

export const extractApiMessage = (error: unknown): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  const fetchError = error as FetchErrorLike;
  return normalizeMessage(fetchError.response?.data?.message);
};

/**
 * Extract error message from API response
 */
export const getErrorMessage = (error: unknown): string => {
  const apiMessage = extractApiMessage(error);
  if (apiMessage) {
    return apiMessage;
  }

  if (error instanceof Error) {
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

export const getAuthErrorMessage = (
  error: unknown,
  context: AuthErrorContext,
): string => {
  const status = getErrorStatus(error);
  const rawMessage = extractApiMessage(error);

  if (context === "login") {
    if (rawMessage === INVALID_CREDENTIALS_MESSAGE) {
      return "Sai tài khoản hoặc mật khẩu. Vui lòng kiểm tra lại.";
    }

    if (status === 401) {
      return "Tài khoản chưa được kích hoạt. Vui lòng xác minh email trước khi đăng nhập.";
    }
  }

  if (context === "register" && rawMessage === "Email already registered") {
    return "Email đã được đăng ký. Vui lòng đăng nhập hoặc đặt lại mật khẩu.";
  }

  if (context === "forgot-password" && status === 400) {
    return "Chúng tôi không tìm thấy tài khoản nào với địa chỉ email này.";
  }

  if (context === "reset-password" && status === 400) {
    return "Liên kết đặt lại mật khẩu của bạn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một liên kết mới.";
  }

  if (context === "resend-verification" && status === 400) {
    return "Không thể gửi lại email xác minh. Tài khoản có thể không tồn tại hoặc đã được xác minh.";
  }

  if (context === "verify-email" && status === 400) {
    return "Liên kết xác minh của bạn không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại email xác minh.";
  }

  return rawMessage ?? getErrorMessage(error);
};

export const shouldSuggestResendVerification = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  const rawMessage = extractApiMessage(error);

  return status === 401 && rawMessage !== INVALID_CREDENTIALS_MESSAGE;
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
