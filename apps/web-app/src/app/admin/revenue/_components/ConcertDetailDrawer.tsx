"use client";

import { X, Calendar } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { getConcertPosterUrl } from "@/services/concert.service";
import { type ConcertRevenueDetailResponse } from "@/services/revenue.service";
import { StatusBadge } from "../../_components/StatusBadge";

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );

const formatConcertDate = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "TBA";
  return (
    d.toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
};

interface ConcertDetailDrawerProps {
  selectedConcertId: string | null;
  detailData: ConcertRevenueDetailResponse | null;
  isDetailLoading: boolean;
  fromDate: string;
  toDate: string;
  tierTotals: {
    total_quantity: number;
    tickets_sold: number;
    remaining_quantity: number;
    revenue: number;
  };
  onClose: () => void;
}

export function ConcertDetailDrawer({
  selectedConcertId,
  detailData,
  isDetailLoading,
  fromDate,
  toDate,
  tierTotals,
  onClose,
}: ConcertDetailDrawerProps) {
  return (
    <AnimatePresence>
      {selectedConcertId && (
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
            className="fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-surface border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-border flex justify-between items-start">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  Concert revenue detail
                </h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  Breakdown of categories and tiers metrics
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-high hover:text-foreground rounded-xl text-muted-foreground transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isDetailLoading ? (
                <div className="py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="font-body text-xs">
                      Loading detail breakdown...
                    </span>
                  </div>
                </div>
              ) : !detailData ? (
                <div className="py-20 text-center text-muted-foreground text-sm font-body">
                  Failed to load details.
                </div>
              ) : (
                <>
                  {/* Concert Info */}
                  <div className="flex gap-4 p-4 rounded-2xl bg-background border border-border">
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-surface-low border border-border relative">
                      <Image
                        src={getConcertPosterUrl()}
                        alt={detailData.concert.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display text-base font-bold text-foreground truncate max-w-[280px]">
                          {detailData.concert.name}
                        </h4>
                        <StatusBadge
                          status={detailData.concert.status}
                          variant="concert"
                          size="xs"
                        />
                      </div>

                      <p className="text-[10px] text-muted-foreground font-semibold font-mono">
                        {formatConcertDate(detailData.concert.start_time)}
                      </p>
                    </div>
                  </div>

                  {/* Date Range Indicator */}
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-background/50 py-1.5 px-3 rounded-lg border border-border/50 uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Date range:</span>
                    <span className="text-foreground">
                      {fromDate
                        ? new Date(fromDate).toLocaleDateString("vi-VN")
                        : "Inception"}
                    </span>
                    <span>→</span>
                    <span className="text-foreground">
                      {toDate
                        ? new Date(toDate).toLocaleDateString("vi-VN")
                        : "Present"}
                    </span>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Total revenue
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-foreground font-mono truncate">
                        {formatVND(detailData.total_revenue)}
                      </span>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Paid orders
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
                        {detailData.paid_orders.toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Tickets sold
                      </span>
                      <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
                        {detailData.tickets_sold.toLocaleString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  {/* Tier Breakdown */}
                  <div className="space-y-3">
                    <h4 className="font-display text-sm font-bold text-foreground">
                      Ticket tier breakdown
                    </h4>
                    <div className="overflow-x-auto border border-border rounded-xl">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-background font-body font-bold text-muted-foreground border-b border-border uppercase tracking-wider">
                            <th className="p-3">Tier name</th>
                            <th className="p-3 text-right">Price (VND)</th>
                            <th className="p-3 text-center">Total qty</th>
                            <th className="p-3 text-center">Sold</th>
                            <th className="p-3 text-center">Remaining</th>
                            <th className="p-3 text-right">Revenue (VND)</th>
                            <th className="p-3 text-center">Gate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-body">
                          {detailData.ticket_tiers?.map((tier) => (
                            <tr
                              key={tier.category_id}
                              className="hover:bg-surface-high/15 transition-colors"
                            >
                              <td className="p-3 font-semibold text-foreground">
                                {tier.name}
                              </td>
                              <td className="p-3 text-right font-mono font-semibold text-foreground">
                                {formatVND(tier.price)}
                              </td>
                              <td className="p-3 text-center font-mono font-semibold text-foreground">
                                {tier.total_quantity.toLocaleString("vi-VN")}
                              </td>
                              <td className="p-3 text-center font-mono font-semibold text-foreground">
                                {tier.tickets_sold.toLocaleString("vi-VN")}
                              </td>
                              <td className="p-3 text-center font-mono font-semibold text-foreground">
                                {tier.remaining_quantity.toLocaleString(
                                  "vi-VN",
                                )}
                              </td>
                              <td className="p-3 text-right font-mono font-bold text-foreground">
                                {formatVND(tier.revenue)}
                              </td>
                              <td className="p-3 text-center font-mono font-semibold text-muted-foreground">
                                {tier.gate_number !== null
                                  ? `Gate ${tier.gate_number}`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-background/40 font-bold border-t border-border">
                            <td className="p-3 text-foreground">Total</td>
                            <td className="p-3 text-right text-muted-foreground">
                              —
                            </td>
                            <td className="p-3 text-center font-mono text-foreground">
                              {tierTotals.total_quantity.toLocaleString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="p-3 text-center font-mono text-foreground">
                              {tierTotals.tickets_sold.toLocaleString("vi-VN")}
                            </td>
                            <td className="p-3 text-center font-mono text-foreground">
                              {tierTotals.remaining_quantity.toLocaleString(
                                "vi-VN",
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-foreground">
                              {formatVND(tierTotals.revenue)}
                            </td>
                            <td className="p-3 text-center text-muted-foreground">
                              —
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
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
