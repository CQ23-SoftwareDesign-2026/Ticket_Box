"use client";

import { useState } from "react";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { KeyRound } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { Input, Button } from "@/components/common";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      showSuccessToast("Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.");
    } catch (err: unknown) {
      const errorMsg = getAuthErrorMessage(err, "forgot-password");
      showErrorToast(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Kiểm tra email của bạn"
        description="Chúng tôi đã gửi liên kết khôi phục mật khẩu đến địa chỉ email của bạn nếu địa chỉ đó tồn tại trên hệ thống."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <p className="text-on-surface-variant/80 text-sm leading-relaxed max-w-sm">
            Vui lòng kiểm tra hộp thư đến và click vào liên kết để thiết lập lại mật khẩu của bạn.
          </p>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Khôi phục mật khẩu"
      description="Nhập địa chỉ email của bạn để chúng tôi gửi liên kết đặt lại mật khẩu mới."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>

        <div className="space-y-1">
          <label className="ticketbox-label text-on-surface-variant/90" htmlFor="email">
            Địa chỉ Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <KeyRound className="h-4 w-4 text-on-surface-variant/40" />
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
          className="w-full mt-4 py-3.5"
          disabled={!email}
          loading={loading}
        >
          Gửi liên kết đặt lại mật khẩu
        </Button>
      </form>
    </TicketBoxAuthShell>
  );
}
