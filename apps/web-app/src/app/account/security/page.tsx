"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TicketBoxAuthShell } from "@/components/ticketbox-auth-shell";
import { SecurityIllustration } from "@/components/ticketbox-illustrations";
import { authService } from "@/services/auth.service";
import { getErrorMessage } from "@/utils/error.utils";

export default function AccountSecurityPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await authService.changePassword(oldPassword, newPassword);
      alert(res.message || "Password updated");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      alert(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  return (
    <ProtectedRoute>
      <TicketBoxAuthShell
        eyebrow="Account"
        title="Security Center"
        description="Manage passwords and sessions."
        sidebar={<SecurityIllustration />}
        footerLinks={[{ label: "Back to dashboard", href: "/dashboard" }]}
      >
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-black text-slate-900">
              Change password
            </h2>
            <div className="mt-5 space-y-4">
              <input
                className="ticketbox-input"
                type="password"
                placeholder="Current password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
              <input
                className="ticketbox-input"
                type="password"
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <input
                className="ticketbox-input"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                className="ticketbox-button-primary w-full"
                onClick={onChangePassword}
                disabled={loading}
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-[#f8fafc] p-6">
            <h2 className="text-xl font-black text-slate-900">Sessions</h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="ticketbox-button-secondary"
                onClick={onLogout}
              >
                Logout
              </button>
            </div>
          </section>
        </div>
      </TicketBoxAuthShell>
    </ProtectedRoute>
  );
}
