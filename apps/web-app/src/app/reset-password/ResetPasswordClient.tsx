"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { Lock } from "lucide-react";
import { getAuthErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { Input, Button } from "@/components/common";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token] = useState<string | null>(
    () => searchParams?.get("token") ?? null,
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  useEffect(() => {
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showErrorToast("Không tìm thấy mã khôi phục. Vui lòng yêu cầu liên kết mới.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 8) {
      showErrorToast("Mật khẩu phải dài ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, newPassword);
      setSuccess(true);
      showSuccessToast("Đặt lại mật khẩu thành công!");

      setTimeout(() => {
        router.replace("/login?reset=1");
      }, 3000);
    } catch (requestError: unknown) {
      const errorMsg = getAuthErrorMessage(requestError, "reset-password");
      showErrorToast(errorMsg);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Đã cập nhật mật khẩu"
        description="Mật khẩu của bạn đã được đặt lại thành công."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <p className="text-on-surface-variant/80 text-sm leading-relaxed">
            Mật khẩu mới của bạn đã được lưu lại thành công. Bạn sẽ tự động được chuyển hướng về trang đăng nhập sau vài giây.
          </p>
          <Button
            href="/login?reset=1"
            className="mt-4 w-full sm:w-auto"
          >
            Đăng nhập ngay
          </Button>
        </div>
      </TicketBoxAuthShell>
    );
  }

  if (!token) {
    return (
      <TicketBoxAuthShell
        title="Liên kết không khả dụng"
        description="Đường dẫn đặt lại mật khẩu đã hết hạn hoặc không tồn tại."
        sidebar={<ConcertHeroIllustration />}
        footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
      >
        <div className="space-y-5 text-center">
          <p className="text-sm text-on-surface-variant/70">
            Vui lòng yêu cầu một liên kết đặt lại mật khẩu mới và thử lại.
          </p>
          <Button
            href="/forgot-password"
            className="w-full"
          >
            Yêu cầu liên kết mới
          </Button>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Tạo mật khẩu mới"
      description="Thiết lập mật khẩu mới cho tài khoản của bạn để tiếp tục."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[{ label: "Quay lại đăng nhập", href: "/login" }]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>

        <div className="space-y-1">
          <label className="ticketbox-label text-on-surface-variant/90" htmlFor="password">
            Mật khẩu mới
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-on-surface-variant/40" />
            </div>
            <Input
              id="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              className="pl-10"
              placeholder="********"
              required
              disabled={loading}
            />
          </div>
          <p className="mt-1 text-xs text-on-surface-variant/50">
            Mật khẩu phải dài ít nhất 8 ký tự.
          </p>
        </div>

        <div className="space-y-1">
          <label className="ticketbox-label text-on-surface-variant/90" htmlFor="confirmPassword">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-on-surface-variant/40" />
            </div>
            <Input
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              className="pl-10"
              placeholder="********"
              required
              disabled={loading}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-6 w-full py-3.5"
          loading={loading}
        >
          Đặt lại mật khẩu
        </Button>
      </form>
    </TicketBoxAuthShell>
  );
}
