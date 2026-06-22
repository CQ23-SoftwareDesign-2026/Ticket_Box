"use client";

import {
  Building2,
  Ticket,
  DollarSign,
  Users,
  CloudSync,
  AlertCircle,
  Upload,
  Search,
  Pencil,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getConcerts, type ConcertCardItem } from "@/services/concert.service";

export default function AdminDashboardPage() {
  const [concerts, setConcerts] = useState<ConcertCardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecentConcerts() {
      try {
        const { items } = await getConcerts({ limit: 4 });
        setConcerts(items);
      } catch (error) {
        console.error("Failed to load concerts for dashboard", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadRecentConcerts();
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Concerts */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
            Total Concerts
          </p>
          <h3 className="font-display text-4xl font-bold text-foreground">
            24
          </h3>
        </div>

        {/* Tickets Sold */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
              <Ticket className="w-6 h-6" />
            </div>
          </div>
          <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1 relative z-10">
            Tickets Sold
          </p>
          <h3 className="font-display text-4xl font-bold text-foreground relative z-10">
            12.4k
          </h3>
        </div>

        {/* Revenue */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
            Revenue
          </p>
          <h3 className="font-display text-4xl font-bold text-foreground">
            $1.2M
          </h3>
        </div>

        {/* Active Users */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-tertiary/10 rounded-lg text-tertiary">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
            Active Users
          </p>
          <h3 className="font-display text-4xl font-bold text-foreground">
            45k
          </h3>
        </div>
      </section>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <section className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-xl font-bold text-foreground">
                Recent Event Performance
              </h3>
              <p className="text-muted-foreground font-body text-sm mt-1">
                Ticket sales velocity across top venues
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold text-muted-foreground hover:bg-surface-high hover:text-primary transition-colors">
                Week
              </button>
              <button className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-body text-xs font-semibold transition-colors">
                Month
              </button>
            </div>
          </div>

          <div className="flex-grow flex items-end gap-2 relative mt-4 pb-8 border-b border-border">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-muted-foreground font-body text-[10px] pb-8 w-8 text-right pr-2">
              <span>10k</span>
              <span>7.5k</span>
              <span>5k</span>
              <span>2.5k</span>
              <span>0</span>
            </div>
            {/* Grid Lines */}
            <div className="absolute left-8 right-0 top-0 h-full flex flex-col justify-between pb-8 pointer-events-none">
              <div className="w-full border-t border-dashed border-border/50 h-0"></div>
              <div className="w-full border-t border-dashed border-border/50 h-0"></div>
              <div className="w-full border-t border-dashed border-border/50 h-0"></div>
              <div className="w-full border-t border-dashed border-border/50 h-0"></div>
              <div className="w-full border-t border-solid border-border h-0"></div>
            </div>
            {/* Bars */}
            <div className="flex-1 flex justify-around items-end h-full pl-8 z-10">
              <div className="w-full max-w-[40px] bg-primary/30 hover:bg-primary/50 rounded-t-sm h-[40%] relative group transition-all">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  4,000
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground font-body text-[10px] truncate w-full text-center">
                  Aug 1
                </div>
              </div>
              <div className="w-full max-w-[40px] bg-primary/50 hover:bg-primary/70 rounded-t-sm h-[65%] relative group transition-all">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  6,500
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground font-body text-[10px] truncate w-full text-center">
                  Aug 8
                </div>
              </div>
              <div className="w-full max-w-[40px] bg-primary hover:bg-primary/90 rounded-t-sm h-[90%] relative group transition-all">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  9,000
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground font-body text-[10px] truncate w-full text-center">
                  Aug 15
                </div>
              </div>
              <div className="w-full max-w-[40px] bg-primary/70 hover:bg-primary/80 rounded-t-sm h-[75%] relative group transition-all">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  7,500
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground font-body text-[10px] truncate w-full text-center">
                  Aug 22
                </div>
              </div>
              <div className="w-full max-w-[40px] bg-primary/40 hover:bg-primary/60 rounded-t-sm h-[50%] relative group transition-all">
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background font-body text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  5,000
                </div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground font-body text-[10px] truncate w-full text-center">
                  Aug 29
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Guest List Sync Widget */}
        <aside className="lg:col-span-1 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <CloudSync className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                Guest List Sync
              </h3>
              <p className="text-muted-foreground font-body text-[11px] font-semibold">
                Last run: 2 mins ago
              </p>
            </div>
          </div>
          <div className="space-y-4 flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary block"></span>
                <span className="font-body text-sm text-foreground">
                  VIP_List_NYC.csv
                </span>
              </div>
              <span className="font-body text-xs font-semibold text-muted-foreground bg-surface-high px-2 py-1 rounded">
                Completed
              </span>
            </div>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error" />
                <div>
                  <h4 className="font-body text-xs font-semibold text-error">
                    Sync Warnings
                  </h4>
                  <p className="font-body text-sm text-muted-foreground mt-1 mb-2">
                    3 duplicate entries found and skipped during import.
                  </p>
                  <button className="text-error font-body text-xs font-semibold hover:underline flex items-center gap-1">
                    <AlertCircle className="w-5 h-5 text-error" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 py-2.5 border border-border hover:border-primary text-foreground hover:text-primary font-body text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" />
            Manual Import
          </button>
        </aside>
      </div>

      {/* Concert List Table */}
      <section className="bg-surface rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-display text-xl font-bold text-foreground">
            Recent Concerts
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />{" "}
            <input
              className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-sm w-full sm:w-64 transition-all"
              placeholder="Search events..."
              type="text"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 border-b border-border">Event Name</th>
                <th className="p-4 border-b border-border">Status</th>
                <th className="p-4 border-b border-border">Date</th>
                <th className="p-4 border-b border-border text-right">
                  Tickets Sold
                </th>
                <th className="p-4 border-b border-border text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="font-body text-sm divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : concerts.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No recent concerts found.
                  </td>
                </tr>
              ) : (
                concerts.map((concert, index) => (
                  <tr
                    key={concert.id}
                    className="hover:bg-surface-high/50 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded bg-primary/10 flex-shrink-0 bg-cover bg-center"
                          style={{
                            backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCN_eZtQcxBMCNY07lBpWVyl6Q6fIrgvEfDf3BInMqhCXeQRd_aGCdyH1Hx-kdRqt_YZpkHVuWbhWuhJCsDqTJRr3BYYihWnQsrZJObp3EeKCtRAgWABU6Oy7WYabdYB1mh5l2adlyHUdRxyJ3RTKTzEmmGBA5S_Y7bEDOAqOW5zlKBkNEQ9Y6fg_teMxYFKjb_L4jg14R4vXH2-ZmeaYq82-UmLVD9Ta_3WRdcX3Tkxk4CT8k4fLJft6lxEyWHfB5onwg5apD8dyWb')`,
                          }}
                        ></div>
                        <div>
                          <p className="font-semibold text-foreground">
                            {concert.title}
                          </p>
                          <p className="text-muted-foreground text-[12px]">
                            {concert.venue}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-body text-[11px] font-semibold ${
                          concert.status === "PUBLISHED"
                            ? "bg-primary/10 text-primary"
                            : concert.status === "COMPLETED"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-surface-highest text-foreground"
                        }`}
                      >
                        {concert.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {concert.date}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-surface-high rounded-full overflow-hidden">
                          <div className="h-full bg-primary w-[75%]"></div>
                        </div>
                        <span className="font-semibold text-foreground">
                          {(1000 + index * 750).toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin/events?edit=${concert.id}`}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          className="p-1.5 text-muted-foreground hover:text-secondary hover:bg-secondary/10 rounded transition-colors"
                          title="Report"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
