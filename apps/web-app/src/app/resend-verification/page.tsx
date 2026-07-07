"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { Mail } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { Input, Button } from "@/components/common";

function ResendVerificationForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams?.get("email") ?? "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.resendVerification(email);
      setSuccess(true);
      showSuccessToast("Email xác thực mới đã được gửi đi.");
    } catch (requestError: unknown) {
      const errorMsg = getAuthErrorMessage(requestError, "resend-verification");
      showErrorToast(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Đã gửi email thành công"
        description="Chúng tôi đã gửi một liên kết xác minh mới tới địa chỉ email của bạn."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <p className="max-w-sm text-on-surface-variant/80 text-sm leading-relaxed">
            Vui lòng kiểm tra hộp thư đến và nhấn vào liên kết để xác thực tài
            khoản của bạn.
          </p>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Gửi lại email xác thực"
      description="Nhập địa chỉ email của bạn và chúng tôi sẽ gửi một liên kết mới để kích hoạt tài khoản."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label
            className="ticketbox-label text-on-surface-variant/90"
            htmlFor="email"
          >
            Địa chỉ Email
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Mail className="h-4 w-4 text-on-surface-variant/40" />
            </div>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="pl-10"
              placeholder="name@example.com"
              required
              disabled={loading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-6 w-full py-3.5"
          disabled={!email}
          loading={loading}
        >
          Gửi lại email xác thực
        </Button>
      </form>
    </TicketBoxAuthShell>
  );
}

export default function ResendVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="ticketbox-panel flex items-center gap-4 px-6 py-5">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="ticketbox-muted">Loading resend verification...</p>
          </div>
        </div>
      }
    >
      <ResendVerificationForm />
    </Suspense>
  );
}
