"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  X,
  Ticket,
  Calendar,
  Crown,
  ScanLine,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteShell } from "@/components/common";
import { useToast } from "@/context/ToastContext";
import { authService } from "@/services/auth.service";
import { getOrders, getOrderById } from "@/services/order.service";

const roleConfig: Record<
  string,
  {
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    badgeClass: string;
    iconClass: string;
  }
> = {
  admin: {
    label: "Quản trị viên",
    icon: Crown,
    badgeClass: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    iconClass: "text-amber-400",
  },
  organizer: {
    label: "Ban Tổ Chức",
    icon: Calendar,
    badgeClass: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
    iconClass: "text-indigo-400",
  },
  checker: {
    label: "Nhân viên soát vé",
    icon: ScanLine,
    badgeClass: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    iconClass: "text-emerald-400",
  },
  audience: {
    label: "Khán giả",
    icon: UserIcon,
    badgeClass: "bg-slate-500/10 border-slate-500/20 text-slate-400",
    iconClass: "text-slate-400",
  },
};

const permissionMap: Record<string, string> = {
  create_concert: "Tạo sự kiện",
  update_concert: "Cập nhật sự kiện",
  delete_concert: "Xóa sự kiện",
  view_revenue: "Xem doanh thu",
  scan_ticket: "Soát vé (Quét QR)",
};

const getPermissionLabel = (perm: string) =>
  permissionMap[perm.toLowerCase()] || perm;

function ProfileContent() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [ticketsOwned, setTicketsOwned] = useState(0);
  const [eventsAttended, setEventsAttended] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  useEffect(() => {
    let active = true;

    const fetchStats = async () => {
      try {
        // 1. Fetch only the most recent orders (up to 50) to optimize loading
        const ordersRes = await getOrders(1, 50);
        if (!active) return;

        const paidOrders = ordersRes.data.filter((o) => o.status === "PAID");

        // Calculate unique concerts user has paid tickets for
        const userConcertNames = Array.from(
          new Set(paidOrders.map((o) => o.concert_name).filter(Boolean)),
        );
        const attendedCount = userConcertNames.length;

        // 2. Fetch order details in small batches of 5 to protect server from overload
        let activeTickets = 0;
        const batchSize = 5;
        for (let i = 0; i < paidOrders.length; i += batchSize) {
          const batch = paidOrders.slice(i, i + batchSize);
          const details = await Promise.all(
            batch.map((o) => getOrderById(o.id).catch(() => null)),
          );
          if (!active) return;

          for (const detail of details) {
            if (detail && detail.tickets) {
              // Count tickets that are paid and not yet scanned
              activeTickets += detail.tickets.filter(
                (t) => !t.is_scanned,
              ).length;
            }
          }
        }

        if (active) {
          setTicketsOwned(activeTickets);
          setEventsAttended(attendedCount);
        }
      } catch (err) {
        console.error("Failed to load profile statistics:", err);
      } finally {
        if (active) setStatsLoading(false);
      }
    };

    void fetchStats();

    return () => {
      active = false;
    };
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showErrorToast("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (newPassword !== confirmPassword) {
      showErrorToast("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      showErrorToast("Mật khẩu mới phải từ 6 ký tự trở lên.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword(
        oldPassword,
        newPassword,
      );
      showSuccessToast(response.message || "Đổi mật khẩu thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto close modal after 1.5 seconds on success
      setTimeout(() => {
        closeModal();
      }, 1500);
    } catch (err) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        "Đổi mật khẩu thất bại. Vui lòng thử lại.";
      showErrorToast(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.fullName);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#16222f]/60 p-6 sm:p-8 shadow-xl backdrop-blur-md"
      >
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 blur-[80px] pointer-events-none" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between relative z-10">
          <div className="flex items-center gap-5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-purple-500 text-2xl font-black text-white shadow-lg shadow-primary/20"
            >
              {initials}
            </motion.div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-black text-on-surface">
                  {user?.fullName || "Người dùng"}
                </h1>
                {user?.roles?.map((role) => {
                  const config =
                    roleConfig[role.toLowerCase()] || roleConfig.audience;
                  const Icon = config.icon;
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold border ${config.badgeClass} animate-in fade-in`}
                    >
                      <Icon size={12} className={config.iconClass} />
                      {config.label}
                    </span>
                  );
                })}
              </div>
              <p className="flex items-center gap-1.5 text-sm text-on-surface-variant/80">
                <Mail size={14} className="text-on-surface-variant/60" />
                {user?.email}
              </p>
            </div>
          </div>

          {/* User Quick Stats */}
          <div className="flex gap-4 sm:gap-6">
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center min-w-[120px] transition-all"
            >
              <div className="flex justify-center text-primary/70 mb-1">
                <Ticket size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
                Vé sở hữu
              </p>
              <p className="mt-1 text-2xl font-black text-primary">
                {statsLoading ? (
                  <Loader2
                    size={20}
                    className="animate-spin mx-auto text-primary/70 mt-1"
                  />
                ) : (
                  ticketsOwned
                )}
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-center min-w-[120px] transition-all"
            >
              <div className="flex justify-center text-primary/70 mb-1">
                <Calendar size={16} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">
                Sự kiện tham gia
              </p>
              <p className="mt-1 text-2xl font-black text-primary">
                {statsLoading ? (
                  <Loader2
                    size={20}
                    className="animate-spin mx-auto text-primary/70 mt-1"
                  />
                ) : (
                  eventsAttended
                )}
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Account Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-3xl border border-slate-800 bg-[#16222f]/45 p-6 sm:p-8 shadow-md"
      >
        <h2 className="font-display text-xl font-bold text-on-surface mb-6 flex items-center gap-2 border-b border-slate-800 pb-3">
          <UserIcon size={18} className="text-primary" />
          Thông tin tài khoản
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-900/40 p-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
              Họ và tên
            </span>
            <span className="text-base font-semibold text-on-surface mt-1.5 block">
              {user?.fullName}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/40 p-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
              Địa chỉ Email
            </span>
            <span className="text-base font-semibold text-on-surface mt-1.5 block truncate">
              {user?.email}
            </span>
          </div>

          <div className="rounded-2xl bg-slate-900/40 p-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
              Vai trò hệ thống
            </span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {user?.roles && user.roles.length > 0 ? (
                user.roles.map((role) => {
                  const config =
                    roleConfig[role.toLowerCase()] || roleConfig.audience;
                  const Icon = config.icon;
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${config.badgeClass}`}
                    >
                      <Icon size={11} className={`${config.iconClass} mr-1`} />
                      {config.label}
                    </span>
                  );
                })
              ) : (
                <span className="text-sm font-semibold text-on-surface">
                  Khách hàng
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/40 p-4 border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
              Trạng thái tài khoản
            </span>
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 mt-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {user?.status === "ACTIVE" ? "ĐANG HOẠT ĐỘNG" : "HOẠT ĐỘNG"}
              </span>
            </div>
          </div>

          {/* Permissions section */}
          <div className="rounded-2xl bg-slate-900/40 p-4 border border-slate-800 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block mb-2">
              Quyền hạn tài khoản
            </span>
            <div className="flex flex-wrap gap-2 mt-1">
              {user?.permissions && user.permissions.length > 0 ? (
                user.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-400 border border-purple-500/20"
                  >
                    {getPermissionLabel(perm)}
                  </span>
                ))
              ) : (
                <span className="text-xs font-medium text-on-surface-variant/60 italic">
                  Không có quyền hạn đặc biệt nào (Khán giả mặc định)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Change Password Trigger */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/25 transition duration-200"
          >
            <KeyRound size={16} />
            Thay đổi mật khẩu
          </motion.button>
        </div>
      </motion.div>

      {/* Password Change Dialog Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[150] overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              {/* Overlay backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="fixed inset-0 bg-[#0b0f17]/80 backdrop-blur-md transition-opacity"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-md transform overflow-hidden rounded-3xl border border-slate-800 bg-[#16222f] p-6 sm:p-8 text-left align-middle shadow-2xl transition-all relative z-10"
              >
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-on-surface-variant/80 hover:bg-slate-900 hover:text-on-surface transition-colors"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3.5 mb-6 border-b border-slate-800 pb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-on-surface">
                      Đổi mật khẩu bảo mật
                    </h3>
                    <p className="text-xs text-on-surface-variant/80 mt-0.5">
                      Cập nhật thông tin thông tin đăng nhập tài khoản của bạn
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {/* Current Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-3.5 text-on-surface-variant/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPassword(!showOldPassword)}
                        className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-primary transition-colors"
                      >
                        {showOldPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-3.5 text-on-surface-variant/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-primary transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80 block">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full rounded-xl border border-slate-800 bg-slate-900/60 pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                      <Lock
                        size={15}
                        className="absolute left-3.5 top-3.5 text-on-surface-variant/60"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={15} />
                        ) : (
                          <Eye size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    disabled={loading}
                    type="submit"
                    className="w-full rounded-xl bg-primary hover:bg-primary-hover text-white py-3 px-4 font-bold text-sm shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2 transition disabled:opacity-75 disabled:cursor-not-allowed mt-4"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang cập nhật mật khẩu...
                      </>
                    ) : (
                      <>Cập nhật mật khẩu</>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <SiteShell active="/profile">
        <ProfileContent />
      </SiteShell>
    </ProtectedRoute>
  );
}
