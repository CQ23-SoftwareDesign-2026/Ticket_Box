import { useState } from "react";
import {
  X,
  ShieldAlert,
  User as UserIcon,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CreateUserModalProps {
  isOpen: boolean;
  newFullName: string;
  newEmail: string;
  newPassword: string;
  newRoles: string[];
  createError: string | null;
  isCreating: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFullNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onRolesChange: (roles: string[]) => void;
}

export function CreateUserModal({
  isOpen,
  newFullName,
  newEmail,
  newPassword,
  newRoles,
  createError,
  isCreating,
  onClose,
  onSubmit,
  onFullNameChange,
  onEmailChange,
  onPasswordChange,
  onRolesChange,
}: CreateUserModalProps) {
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (newPassword.length < 6) {
      setLocalError("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setLocalError("Mật khẩu nhập lại không trùng khớp.");
      return;
    }

    onSubmit(e);
  };

  const activeError = localError || createError;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />

          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-border flex justify-between items-center bg-surface-low">
                <div className="flex items-center gap-2 text-primary">
                  <UserIcon className="w-5 h-5" />
                  <h3 className="font-display text-base font-bold text-foreground">
                    Tạo tài khoản người dùng
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-surface-high hover:text-foreground rounded-lg text-muted-foreground transition-all active:scale-95 duration-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="p-5 space-y-4 font-body text-xs"
              >
                {activeError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{activeError}</span>
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Họ và tên *
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      placeholder="Nguyễn Văn A"
                      value={newFullName}
                      onChange={(e) => onFullNameChange(e.target.value)}
                      className="pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full transition-all text-foreground"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Địa chỉ Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      placeholder="example@email.com"
                      value={newEmail}
                      onChange={(e) => onEmailChange(e.target.value)}
                      className="pl-9 pr-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full transition-all text-foreground"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => onPasswordChange(e.target.value)}
                      className="pl-9 pr-10 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full transition-all text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Nhập lại mật khẩu *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-9 pr-10 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full transition-all text-foreground"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Roles (Select 1 only) */}
                <div className="space-y-1.5">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Vai trò *
                  </label>
                  <select
                    value={newRoles[0] || "Audience"}
                    onChange={(e) => onRolesChange([e.target.value])}
                    className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full h-11 transition-all cursor-pointer"
                  >
                    <option value="Audience">Audience</option>
                    <option value="Admin">Admin</option>
                    <option value="Checker">Checker</option>
                    <option value="Organizer">Organizer</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-3 border-t border-border mt-5">
                  <button
                    type="button"
                    onClick={onClose}
                    className="bg-background hover:bg-surface-low border border-border text-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl transition-all active:scale-95 duration-200"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary hover:bg-primary-container text-white font-body text-xs font-bold py-2.5 px-5 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 duration-200 disabled:opacity-50"
                  >
                    {isCreating ? "Đang tạo..." : "Lưu người dùng"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
