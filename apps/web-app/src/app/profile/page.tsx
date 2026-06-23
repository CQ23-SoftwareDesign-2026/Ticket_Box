"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User as UserIcon,
  KeyRound,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Loader2,
  X,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SiteShell } from "@/components/common";
import { authService } from "@/services/auth.service";

function ProfileContent() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải từ 6 ký tự trở lên.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.changePassword(
        oldPassword,
        newPassword,
      );
      setSuccess(response.message || "Đổi mật khẩu thành công!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Đổi mật khẩu thất bại. Vui lòng thử lại.";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
    setSuccess(null);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-[24px] border border-outline-variant/80 bg-surface p-6 sm:p-8 shadow-[0_4px_24px_rgba(113,50,245,0.03)]"
      >
        <div className="absolute top-0 right-0 h-40 w-40 bg-[#7132f5]/5 blur-[80px]" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#7132f5] to-[#8d5bf7] text-2xl font-black text-white shadow-lg shadow-[#7132f5]/20"
            >
              {initials}
            </motion.div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-black text-on-surface">
                  {user?.fullName || "User Profile"}
                </h1>
                {user?.roles?.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-lg bg-[#7132f5]/10 px-2.5 py-1 text-xs font-bold text-[#7132f5] border border-[#7132f5]/25"
                  >
                    {role}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-on-surface-variant/80">
                <Mail size={14} className="text-on-surface-variant/60" />
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex gap-4 sm:gap-6">
            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-outline-variant bg-surface-low p-4 text-center min-w-[110px]"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Tickets Owned
              </p>
              <p className="mt-1.5 text-3xl font-black text-[#7132f5]">12</p>
            </motion.div>

            <motion.div
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-outline-variant bg-surface-low p-4 text-center min-w-[110px]"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Events Attended
              </p>
              <p className="mt-1.5 text-3xl font-black text-[#7132f5]">8</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="rounded-[24px] border border-outline-variant/80 bg-surface p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.02)]"
      >
        <h2 className="font-display text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
          <UserIcon size={18} className="text-[#7132f5]" />
          Account Details
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-low p-4 border border-outline-variant/40">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
              Full Name
            </span>
            <span className="text-base font-semibold text-on-surface mt-1.5 block">
              {user?.fullName}
            </span>
          </div>

          <div className="rounded-xl bg-surface-low p-4 border border-outline-variant/40">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
              Email Address
            </span>
            <span className="text-base font-semibold text-on-surface mt-1.5 block truncate">
              {user?.email}
            </span>
          </div>

          <div className="rounded-xl bg-surface-low p-4 border border-outline-variant/40">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
              Role
            </span>
            <span className="text-base font-semibold text-on-surface mt-1.5 block">
              {user?.roles?.join(", ") || "User"}
            </span>
          </div>

          <div className="rounded-xl bg-surface-low p-4 border border-outline-variant/40">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant block">
              Account Status
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20 mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {user?.status || "ACTIVE"}
            </span>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-outline-variant/45 flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#7132f5] hover:bg-[#5b22cf] text-white px-6 py-3.5 rounded-[12px] font-bold text-sm shadow-md shadow-[#7132f5]/10 hover:shadow-lg hover:shadow-[#7132f5]/25 transition duration-200"
          >
            <KeyRound size={16} />
            Change Password
          </motion.button>
        </div>
      </motion.div>
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-100 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="fixed inset-0 bg-[#101114]/60 backdrop-blur-sm transition-opacity"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="w-full max-w-md transform overflow-hidden rounded-[24px] border border-outline-variant/80 bg-surface p-6 sm:p-8 text-left align-middle shadow-2xl transition-all relative z-10"
              >
                <button
                  onClick={closeModal}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-on-surface-variant hover:bg-surface-low hover:text-on-surface transition-colors"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3.5 mb-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#7132f5]/10 text-[#7132f5]">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-on-surface">
                      Change Password
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Update your account security credentials
                    </p>
                  </div>
                </div>
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <div className="flex gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-medium text-red-600">
                        <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                        <div>{error}</div>
                      </div>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <div className="flex gap-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs font-medium text-emerald-700">
                        <CheckCircle size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold">{success}</p>
                          <button
                            onClick={closeModal}
                            className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950 transition"
                          >
                            Close this window
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {!success && (
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showOldPassword ? "text" : "password"}
                          value={oldPassword}
                          onChange={(e) => setOldPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full rounded-[12px] border border-outline-variant bg-surface-low pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/15"
                        />
                        <Lock
                          size={15}
                          className="absolute left-3.5 top-3.5 text-on-surface-variant/60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPassword(!showOldPassword)}
                          className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-[#7132f5] transition-colors"
                        >
                          {showOldPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="w-full rounded-[12px] border border-outline-variant bg-surface-low pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/15"
                        />
                        <Lock
                          size={15}
                          className="absolute left-3.5 top-3.5 text-on-surface-variant/60"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-[#7132f5] transition-colors"
                        >
                          {showNewPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full rounded-[12px] border border-outline-variant bg-surface-low pl-10 pr-10 py-3 text-sm text-on-surface outline-none transition focus:border-[#7132f5] focus:ring-2 focus:ring-[#7132f5]/15"
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
                          className="absolute right-3.5 top-3.5 text-on-surface-variant/60 hover:text-[#7132f5] transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      disabled={loading}
                      type="submit"
                      className="w-full rounded-[12px] bg-[#7132f5] hover:bg-[#5b22cf] text-white py-3 px-4 font-bold text-sm shadow-md shadow-[#7132f5]/10 hover:shadow-lg hover:shadow-[#7132f5]/25 flex items-center justify-center gap-2 transition disabled:opacity-75 disabled:cursor-not-allowed mt-4"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>Update Password</>
                      )}
                    </motion.button>
                  </form>
                )}
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
