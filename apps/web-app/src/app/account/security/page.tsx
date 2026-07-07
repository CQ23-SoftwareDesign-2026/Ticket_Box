"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { SecurityIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error.utils";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { Input, Button } from "@/components/common";
import { Lock, LogOut } from "lucide-react";

export default function AccountSecurityPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      showErrorToast("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword.length < 8) {
      showErrorToast("Mật khẩu mới phải dài ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword(oldPassword, newPassword);
      showSuccessToast(res.message || "Đã cập nhật mật khẩu mới thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      showErrorToast(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showSuccessToast("Đăng xuất thành công!");
      router.push("/login");
    } catch {
      showErrorToast("Đăng xuất thất bại. Vui lòng thử lại.");
    }
  };

  return (
    <ProtectedRoute>
      <TicketBoxAuthShell
        eyebrow="Tài khoản"
        title="Trung tâm Bảo mật"
        description="Quản lý mật khẩu và phiên đăng nhập của bạn."
        sidebar={<SecurityIllustration />}
        footerLinks={[{ label: "Quay lại trang cá nhân", href: "/profile" }]}
      >
        <div className="space-y-6">
          {/* Change password section */}
          <section className="rounded-3xl border border-outline-variant/40 bg-surface/20 p-6 backdrop-blur-lg shadow-xl">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-4">
              <Lock size={18} className="text-primary" />
              Đổi mật khẩu
            </h2>

            <form onSubmit={onChangePassword} className="space-y-4">
              <div className="space-y-1">
                <label
                  className="ticketbox-label text-on-surface-variant/80"
                  htmlFor="currentPassword"
                >
                  Mật khẩu hiện tại
                </label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="********"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label
                  className="ticketbox-label text-on-surface-variant/80"
                  htmlFor="newPassword"
                >
                  Mật khẩu mới
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="********"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-[11px] text-on-surface-variant/50">
                  Mật khẩu cần dài ít nhất 8 ký tự.
                </p>
              </div>

              <div className="space-y-1">
                <label
                  className="ticketbox-label text-on-surface-variant/80"
                  htmlFor="confirmPassword"
                >
                  Xác nhận mật khẩu mới
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full justify-center py-3.5 mt-2"
                loading={loading}
              >
                Cập nhật mật khẩu
              </Button>
            </form>
          </section>

          {/* Sessions section */}
          <section className="rounded-3xl border border-outline-variant/40 bg-surface-low/30 p-6 backdrop-blur-lg shadow-xl">
            <h2 className="text-lg font-bold text-on-surface flex items-center gap-2 mb-2">
              <LogOut size={18} className="text-rose-500" />
              Phiên đăng nhập
            </h2>
            <p className="text-xs text-on-surface-variant/60 mb-4">
              Đăng xuất khỏi thiết bị hiện tại của bạn.
            </p>
            <Button
              type="button"
              variant="soft"
              className="w-full sm:w-auto justify-center px-6 py-2.5 text-rose-400 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer"
              onClick={handleLogout}
            >
              Đăng xuất ngay
            </Button>
          </section>
        </div>
      </TicketBoxAuthShell>
    </ProtectedRoute>
  );
}
