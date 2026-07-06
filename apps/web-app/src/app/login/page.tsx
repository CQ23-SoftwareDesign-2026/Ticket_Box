"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { Input, Button } from "@/components/common";
import {
  getAuthErrorMessage,
  shouldSuggestResendVerification,
} from "@/utils/error.utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams?.get("returnUrl") || "/";
  const verified = searchParams?.get("verified") === "1";
  const reset = searchParams?.get("reset") === "1";
  const registered = searchParams?.get("registered") === "1";
  const { login } = useAuth();
  const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToast();

  const [email, setEmail] = useState(searchParams?.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  useEffect(() => {
    if (verified) {
      showSuccessToast("Email của bạn đã được xác minh thành công. Bạn có thể đăng nhập ngay.");
    }
    if (reset) {
      showSuccessToast("Mật khẩu của bạn đã được cập nhật. Vui lòng đăng nhập bằng mật khẩu mới.");
    }
    if (registered) {
      showInfoToast("Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực trước khi đăng nhập.");
    }
  }, [verified, reset, registered, showSuccessToast, showInfoToast]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowResendVerification(false);

    try {
      const response = await authService.login(email, password);
      login(response.user);
      showSuccessToast("Đăng nhập thành công!");
      router.replace(returnUrl);
    } catch (err: unknown) {
      const errorMsg = getAuthErrorMessage(err, "login");
      showErrorToast(errorMsg);
      setShowResendVerification(shouldSuggestResendVerification(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <TicketBoxAuthShell
      title="Chào mừng quay lại"
      description="Đăng nhập tài khoản của bạn để quản lý vé, xem sự kiện và thông tin cá nhân."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[
        { label: "Chưa có tài khoản? Đăng ký ngay", href: "/register" },
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        {showResendVerification ? (
          <div className="rounded-xl bg-red-950/40 border border-red-500/20 p-4 text-sm text-red-300">
            <p className="mb-2">Tài khoản của bạn chưa được xác thực email.</p>
            <Link
              href={`/resend-verification?email=${encodeURIComponent(email)}`}
              className="inline-flex font-bold text-red-400 hover:text-red-300 underline underline-offset-4"
            >
              Gửi lại email xác thực
            </Link>
          </div>
        ) : null}

        <div className="space-y-1">
          <label className="ticketbox-label text-on-surface-variant/90" htmlFor="email">
            Địa chỉ Email
          </label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@example.com"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="ticketbox-label text-on-surface-variant/90 mb-0" htmlFor="password">
              Mật khẩu
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary-container transition-colors"
            >
              Quên mật khẩu?
            </Link>
          </div>
          <Input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="********"
            required
            disabled={loading}
          />
        </div>

        <Button
          type="submit"
          className="mt-4 w-full py-3.5"
          loading={loading}
        >
          Đăng nhập
        </Button>
      </form>
    </TicketBoxAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="ticketbox-muted">Loading sign in...</p>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
