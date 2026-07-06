"use client";

import { Building2, Ticket, DollarSign, Users } from "lucide-react";
import { formatConcertCurrency } from "@/services/concert.service";
import { type DashboardSummary } from "@/services/dashboard.service";

interface DashboardSummaryCardsProps {
  summary: DashboardSummary | null;
  isLoadingSummary: boolean;
  formatSummaryNumber: (value: number, type: "number" | "currency") => string;
}

export function DashboardSummaryCards({
  summary,
  isLoadingSummary,
  formatSummaryNumber,
}: DashboardSummaryCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Published Events */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
          Published Events
        </p>
        <h3 className="font-display text-4xl font-extrabold text-primary">
          {isLoadingSummary ? (
            <div className="h-9 w-16 bg-surface-high animate-pulse rounded" />
          ) : (
            formatSummaryNumber(summary?.published_events ?? 0, "number")
          )}
        </h3>
        {!isLoadingSummary && (
          <p className="text-[10px] text-muted-foreground font-body mt-1">
            Active on platform
          </p>
        )}
      </div>

      {/* Tickets Sold */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
            <Ticket className="w-6 h-6" />
          </div>
        </div>
        <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">
          Tickets Sold
        </p>
        <h3 className="font-display text-4xl font-extrabold text-tertiary relative z-10">
          {isLoadingSummary ? (
            <div className="h-9 w-20 bg-surface-high animate-pulse rounded" />
          ) : (
            formatSummaryNumber(summary?.tickets_sold ?? 0, "number")
          )}
        </h3>
        {!isLoadingSummary && (
          <p className="text-[10px] text-muted-foreground font-body mt-1 relative z-10">
            Successful bookings
          </p>
        )}
      </div>

      {/* Total Revenue */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
          Total Revenue
        </p>
        <h3
          className="font-display text-3xl font-extrabold text-emerald-600 truncate cursor-help"
          title={summary ? formatConcertCurrency(summary.total_revenue) : ""}
        >
          {isLoadingSummary ? (
            <div className="h-9 w-28 bg-surface-high animate-pulse rounded" />
          ) : (
            formatSummaryNumber(summary?.total_revenue ?? 0, "currency")
          )}
        </h3>
        {!isLoadingSummary && summary && (
          <p className="text-[10px] text-muted-foreground font-mono mt-1">
            Exact: {formatConcertCurrency(summary.total_revenue)}
          </p>
        )}
      </div>

      {/* Registered Users */}
      <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex justify-between items-start mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
          Registered Users
        </p>
        <h3 className="font-display text-4xl font-extrabold text-on-surface">
          {isLoadingSummary ? (
            <div className="h-9 w-16 bg-surface-high animate-pulse rounded" />
          ) : (
            formatSummaryNumber(summary?.total_users ?? 0, "number")
          )}
        </h3>
        {!isLoadingSummary && (
          <p className="text-[10px] text-muted-foreground font-body mt-1">
            Total member accounts
          </p>
        )}
      </div>
    </section>
  );
}
