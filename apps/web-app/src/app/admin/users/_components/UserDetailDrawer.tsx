"use client";

import { X, ShoppingBag, CheckCircle, Ticket, DollarSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type AdminUserDetail } from "@/services/admin-user.service";

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

interface UserDetailDrawerProps {
  selectedUserId: string | null;
  detailData: AdminUserDetail | null;
  isDetailLoading: boolean;
  draftStatus: string;
  draftRoles: string[];
  isSavingDraft: boolean;
  onClose: () => void;
  onDraftStatusChange: (v: string) => void;
  onDraftRolesChange: (roles: string[]) => void;
  onCancelDraft: () => void;
  onSaveChanges: () => void;
}

export function UserDetailDrawer({
  selectedUserId,
  detailData,
  isDetailLoading,
  draftStatus,
  draftRoles,
  isSavingDraft,
  onClose,
  onDraftStatusChange,
  onDraftRolesChange,
  onCancelDraft,
  onSaveChanges,
}: UserDetailDrawerProps) {
  const statusChanged = detailData ? draftStatus !== detailData.status : false;
  const rolesChanged = detailData
    ? JSON.stringify([...draftRoles].sort()) !==
      JSON.stringify([...detailData.roles].sort())
    : false;
  const hasChanges = statusChanged || rolesChanged;

  return (
    <AnimatePresence>
      {selectedUserId && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.3 }}
            className="fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-surface border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden text-foreground"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-start bg-surface-low">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 rounded-full bg-primary-container text-primary-foreground flex items-center justify-center font-bold text-lg ring-2 ring-primary/20">
                  {detailData?.full_name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {detailData?.full_name || "User Details"}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {detailData?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-high hover:text-foreground rounded-xl text-muted-foreground transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading ? (
                <div className="py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="font-body text-xs">
                      Loading profile breakdown...
                    </span>
                  </div>
                </div>
              ) : !detailData ? (
                <div className="py-20 text-center text-muted-foreground text-sm font-body">
                  Failed to load details.
                </div>
              ) : (
                <>
                  {/* Stat Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm text-center">
                      <ShoppingBag className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Orders
                      </p>
                      <p className="text-xl font-black text-foreground font-mono mt-0.5">
                        {detailData.stats.order_count}
                      </p>
                    </div>
                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm text-center">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Paid Orders
                      </p>
                      <p className="text-xl font-black text-foreground font-mono mt-0.5">
                        {detailData.stats.paid_order_count}
                      </p>
                    </div>
                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm text-center">
                      <Ticket className="w-5 h-5 text-violet-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tickets
                      </p>
                      <p className="text-xl font-black text-foreground font-mono mt-0.5">
                        {detailData.stats.ticket_count}
                      </p>
                    </div>
                    <div className="bg-background border border-border rounded-2xl p-4 shadow-sm text-center">
                      <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Total Spent
                      </p>
                      <p className="text-xs font-bold text-foreground font-mono mt-1.5 leading-tight truncate">
                        {formatVND(detailData.stats.total_spent)}
                      </p>
                    </div>
                  </div>

                  {/* Status & Roles Editor */}
                  <div className="space-y-4 bg-background rounded-2xl border border-border p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Status */}
                      <div className="space-y-3">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          Account Status
                        </h4>
                        <select
                          disabled={isSavingDraft}
                          value={draftStatus}
                          onChange={(e) => onDraftStatusChange(e.target.value)}
                          className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full h-10 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                          <option value="BANNED">BANNED</option>
                          <option value="PENDING">PENDING</option>
                        </select>
                      </div>

                      {/* Roles */}
                      <div className="space-y-3">
                        <h4 className="font-display text-sm font-bold text-foreground">
                          Account Roles
                        </h4>
                        <div className="flex flex-wrap gap-4 pt-1">
                          {["Audience", "Admin", "Checker", "Organizer"].map(
                            (roleName) => (
                              <label
                                key={roleName}
                                className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none"
                              >
                                <input
                                  type="checkbox"
                                  disabled={isSavingDraft}
                                  checked={draftRoles.includes(roleName)}
                                  onChange={(e) => {
                                    const nextRoles = e.target.checked
                                      ? [...draftRoles, roleName]
                                      : draftRoles.filter(
                                          (r) => r !== roleName,
                                        );
                                    onDraftRolesChange(nextRoles);
                                  }}
                                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary bg-surface cursor-pointer"
                                />
                                {roleName}
                              </label>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    {hasChanges && (
                      <div className="pt-4 border-t border-border flex justify-end gap-2 animate-fadeIn">
                        <button
                          type="button"
                          onClick={onCancelDraft}
                          disabled={isSavingDraft}
                          className="bg-surface hover:bg-surface-high border border-border text-foreground font-body text-xs font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Are you sure you want to save these changes?",
                              )
                            ) {
                              void onSaveChanges();
                            }
                          }}
                          disabled={isSavingDraft}
                          className="bg-primary hover:bg-primary-container text-white font-body text-xs font-semibold py-2 px-5 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 cursor-pointer disabled:opacity-50"
                        >
                          {isSavingDraft ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recent Orders */}
                  <div className="space-y-3">
                    <h4 className="font-display text-sm font-bold text-foreground">
                      Recent Purchase Orders
                    </h4>
                    {detailData.recent_orders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground font-body text-xs border border-border border-dashed rounded-xl bg-background/20">
                        This user has not placed any orders yet.
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden bg-background">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border bg-surface-low font-body text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              <th className="p-3">Concert</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 text-center">Tickets</th>
                              <th className="p-3">Order Date</th>
                            </tr>
                          </thead>
                          <tbody className="font-body divide-y divide-border/50">
                            {detailData.recent_orders.map((o) => (
                              <tr
                                key={o.order_id}
                                className="hover:bg-surface-high/10"
                              >
                                <td className="p-3 font-bold text-foreground">
                                  {o.concert_name}
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.25 rounded text-[8px] font-bold border uppercase ${ORDER_STATUS_CLASSES[o.status] ?? "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}
                                  >
                                    {o.status}
                                  </span>
                                </td>
                                <td className="p-3 text-right font-bold text-foreground font-mono">
                                  {formatVND(o.total_amount)}
                                </td>
                                <td className="p-3 text-center font-bold text-foreground font-mono">
                                  {o.ticket_count}
                                </td>
                                <td className="p-3 text-muted-foreground font-semibold">
                                  {new Date(o.created_at).toLocaleDateString(
                                    "vi-VN",
                                    { month: "short", day: "numeric" },
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
