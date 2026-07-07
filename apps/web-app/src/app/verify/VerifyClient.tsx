"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { getAuthErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/common";

export default function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(
    () => searchParams?.get("token") ?? null,
  );
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState<string | null>(
    token
      ? null
      : "Không tìm thấy mã xác thực. Vui lòng yêu cầu gửi lại email xác thực.",
  );
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  useEffect(() => {
    if (!token) {
      if (message) showErrorToast(message);
      return;
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    let active = true;

    const verify = async () => {
      try {
        const response = await fetch(
          `/api/auth/verify?token=${encodeURIComponent(token)}`,
        );
        const data = (await response.json()) as { message?: string };

        if (!active) {
          return;
        }

        if (!response.ok) {
          throw {
            response: {
              status: response.status,
              data,
            },
          };
        }

        setStatus("success");
        const msg =
          data.message ?? "Email của bạn đã được xác minh thành công.";
        setMessage(msg);
        showSuccessToast(msg);

        setTimeout(() => {
          router.replace("/login?verified=1");
        }, 1800);
      } catch (error) {
        if (!active) {
          return;
        }

        setStatus("error");
        const errMsg = getAuthErrorMessage(error, "verify-email");
        setMessage(errMsg);
        showErrorToast(errMsg);
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [router, token, message, showErrorToast, showSuccessToast]);

  return (
    <TicketBoxAuthShell
      title={
        status === "loading"
          ? "Đang xác thực tài khoản"
          : status === "success"
            ? "Xác thực email thành công"
            : "Xác thực thất bại"
      }
      description={
        status === "loading"
          ? "Chúng tôi đang kiểm tra đường dẫn xác thực của bạn."
          : status === "success"
            ? "Email của bạn đã được xác minh thành công. Bạn có thể đăng nhập."
            : "Liên kết xác thực này đã hết hạn hoặc không hợp lệ."
      }
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[
        { label: "Quay lại đăng nhập", href: "/login" },
        { label: "Gửi lại email xác thực", href: "/resend-verification" },
      ]}
    >
      <div className="space-y-5">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <svg
              className="animate-spin h-10 w-10 text-primary"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-on-surface-variant/60">
              Vui lòng chờ trong giây lát...
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="py-6 text-center">
            <p className="text-sm text-on-surface-variant/80 leading-relaxed">
              Email của bạn đã được xác minh thành công. Đang tự động chuyển
              hướng về trang đăng nhập...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="py-6 text-center">
            <p className="text-sm text-on-surface-variant/80 leading-relaxed">
              Xác thực email thất bại hoặc liên kết đã hết hạn. Vui lòng yêu cầu
              liên kết mới.
            </p>
          </div>
        )}

        <Button href="/login" className="w-full py-3.5 mt-2">
          {status === "success" ? "Tiếp tục đăng nhập" : "Quay lại đăng nhập"}
        </Button>

        {status === "error" ? (
          <div className="text-center pt-2">
            <Link
              href="/resend-verification"
              className="inline-flex text-sm font-semibold text-primary hover:text-primary-container transition-colors"
            >
              Yêu cầu lại email xác thực mới
            </Link>
          </div>
        ) : null}
      </div>
    </TicketBoxAuthShell>
  );
}
