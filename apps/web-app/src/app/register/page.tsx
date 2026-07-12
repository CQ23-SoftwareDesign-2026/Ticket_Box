"use client";

import Link from "next/link";
import { useState } from "react";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { ConcertHeroIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { getAuthErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { Input, Button } from "@/components/common";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      showErrorToast("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      await authService.register(email, password, fullName);
      setSuccess(true);
      showSuccessToast(
        "Đăng ký tài khoản thành công! Vui lòng xác thực email.",
      );
    } catch (requestError: unknown) {
      const errorMsg = getAuthErrorMessage(requestError, "register");
      showErrorToast(errorMsg);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <TicketBoxAuthShell
        title="Kiểm tra email của bạn"
        description="Chúng tôi đã gửi một liên kết xác nhận đến địa chỉ email của bạn. Vui lòng xác thực tài khoản để tiếp tục."
        sidebar={<ConcertHeroIllustration />}
      >
        <div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
          <p className="text-on-surface-variant/85 text-sm leading-relaxed">
            Hệ thống đã gửi liên kết xác thực tới hòm thư của bạn. Vui lòng kiểm
            tra hộp thư và nhấn vào liên kết để kích hoạt tài khoản của bạn
            trước khi đăng nhập.
          </p>
          <Button
            href={`/login?registered=1&email=${encodeURIComponent(email)}`}
            className="mt-4 w-full sm:w-auto"
          >
            Quay lại đăng nhập
          </Button>
          <Link
            href={`/resend-verification?email=${encodeURIComponent(email)}`}
            className="text-sm font-semibold text-primary hover:text-primary-container transition-colors"
          >
            Gửi lại email xác thực
          </Link>
        </div>
      </TicketBoxAuthShell>
    );
  }

  return (
    <TicketBoxAuthShell
      title="Đăng ký tài khoản"
      description="Tham gia TicketBox để khám phá và sở hữu vé tham gia những sự kiện âm nhạc đỉnh cao."
      sidebar={<ConcertHeroIllustration />}
      footerLinks={[
        { label: "Đã có tài khoản? Đăng nhập ngay", href: "/login" },
      ]}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="space-y-1">
          <label
            className="ticketbox-label text-on-surface-variant/90"
            htmlFor="fullName"
          >
            Họ và tên
          </label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            type="text"
            placeholder="Nguyễn Văn A"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-1">
          <label
            className="ticketbox-label text-on-surface-variant/90"
            htmlFor="email"
          >
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
          <label
            className="ticketbox-label text-on-surface-variant/90"
            htmlFor="password"
          >
            Mật khẩu
          </label>
          <Input
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="********"
            required
            minLength={8}
            disabled={loading}
          />
          <p className="mt-1 text-xs text-on-surface-variant/50">
            Mật khẩu phải dài ít nhất 8 ký tự.
          </p>
        </div>

        <div className="space-y-1">
          <label
            className="ticketbox-label text-on-surface-variant/90"
            htmlFor="confirmPassword"
          >
            Nhập lại mật khẩu
          </label>
          <Input
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            placeholder="********"
            required
            minLength={8}
            disabled={loading}
          />
        </div>

        <Button type="submit" className="mt-6 w-full py-3.5" loading={loading}>
          Đăng ký tài khoản
        </Button>
      </form>
    </TicketBoxAuthShell>
  );
}
