"use client";

import { Building2, Ticket, DollarSign, Users, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { formatConcertCurrency } from "@/services/concert.service";
import {
  getDashboardSummary,
  getDashboardRevenue,
  getDashboardRecentOrders,
  type DashboardSummary,
  type RevenueItem,
  type RecentOrder,
} from "@/services/dashboard.service";
import {
  getAdminOrders,
  type AdminOrderListItem,
} from "@/services/order.service";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [fromDate, setFromDate] = useState<string>("2026-03-01");
  const [toDate, setToDate] = useState<string>("2026-07-04");
  const [status, setStatus] = useState<string>("All");

  // Temporary UI filter values before clicking "Apply"
  const [tempFromDate, setTempFromDate] = useState<string>("2026-03-01");
  const [tempToDate, setTempToDate] = useState<string>("2026-07-04");
  const [tempGroupBy, setTempGroupBy] = useState<"day" | "week" | "month">(
    "day",
  );
  const [tempStatus, setTempStatus] = useState<string>("All");

  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for View All Orders
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOrders, setModalOrders] = useState<AdminOrderListItem[]>([]);
  const [modalPage, setModalPage] = useState(1);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalSearch, setModalSearch] = useState("");
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalStatusFilter, setModalStatusFilter] = useState<string>("");

  // Hover state for interactive SVG chart
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    async function loadSummaryAndOrders() {
      try {
        setIsLoadingSummary(true);
        const sumData = await getDashboardSummary();
        setSummary(sumData);
      } catch (err) {
        console.error("Failed to load dashboard summary", err);
      } finally {
        setIsLoadingSummary(false);
      }

      try {
        setIsLoadingOrders(true);
        const orders = await getDashboardRecentOrders({ limit: 10 });
        setRecentOrders(orders);
      } catch (err) {
        console.error("Failed to load recent orders", err);
      } finally {
        setIsLoadingOrders(false);
      }
    }

    loadSummaryAndOrders();
  }, []);

  useEffect(() => {
    async function loadRevenue() {
      try {
        setIsLoadingRevenue(true);
        const data = await getDashboardRevenue({
          group_by: groupBy,
          from: fromDate || undefined,
          to: toDate || undefined,
          status: status || undefined,
        });
        setRevenueData(data);
      } catch (err) {
        console.error("Failed to load revenue trend", err);
      } finally {
        setIsLoadingRevenue(false);
      }
    }

    loadRevenue();
  }, [groupBy, fromDate, toDate, status]);

  const handleApply = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setGroupBy(tempGroupBy);
    setStatus(tempStatus);
  };

  const handleReset = () => {
    setTempFromDate("2026-03-01");
    setTempToDate("2026-07-04");
    setTempGroupBy("day");
    setTempStatus("All");

    setFromDate("2026-03-01");
    setToDate("2026-07-04");
    setGroupBy("day");
    setStatus("All");
  };

  // Fetch all orders for modal
  useEffect(() => {
    if (!isModalOpen) return;

    async function fetchAllOrders() {
      try {
        setIsModalLoading(true);
        const response = await getAdminOrders({
          page: modalPage,
          limit: 10,
          search: modalSearch || undefined,
          status: modalStatusFilter || undefined,
        });
        setModalOrders(response.data);
        setModalTotalPages(response.meta.totalPages);
      } catch (err) {
        console.error("Failed to fetch all orders", err);
      } finally {
        setIsModalLoading(false);
      }
    }

    const delayDebounce = setTimeout(() => {
      fetchAllOrders();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [isModalOpen, modalPage, modalSearch, modalStatusFilter]);

  // Metrics helper for values formatting
  const formatSummaryNumber = (value: number, type: "number" | "currency") => {
    if (type === "number") {
      return new Intl.NumberFormat("en-US").format(value);
    }

    // For currency:
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })} Bđ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })} Mđ`;
    }
    return `${new Intl.NumberFormat("en-US").format(value)}đ`;
  };

  const formatValueVND = (value: number) => {
    return `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} VND`;
  };

  const maxRevenue =
    revenueData.length > 0
      ? Math.max(...revenueData.map((d) => d.revenue), 1000)
      : 1000;

  const yLabels = [
    maxRevenue,
    maxRevenue * 0.75,
    maxRevenue * 0.5,
    maxRevenue * 0.25,
    0,
  ];

  const formatYAxisLabel = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}k`;
    }
    return `${value}`;
  };

  const formatXAxisLabel = (period: string, type: "day" | "week" | "month") => {
    if (!period) return "";
    const parts = period.split("-");
    if (type === "month" && parts.length >= 2) {
      return `${parts[1]}/${parts[0].slice(2)}`; // e.g. "07/26"
    }
    if (parts.length >= 3) {
      return `${parts[2]}/${parts[1]}`; // dd/mm format
    }
    return period;
  };

  const formatDateSubtext = (period: string) => {
    if (!period) return "";
    const parts = period.split("-");
    if (parts.length === 3) {
      const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      );
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    if (parts.length === 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    return period;
  };

  // SVG Line Chart calculations
  const svgWidth = 800;
  const svgHeight = 300;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const points = revenueData.map((item, index) => {
    const x =
      paddingLeft +
      (revenueData.length > 1
        ? (index / (revenueData.length - 1)) * chartWidth
        : chartWidth / 2);
    const y =
      paddingTop +
      chartHeight -
      (maxRevenue > 0 ? (item.revenue / maxRevenue) * chartHeight : 0);
    return { x, y, item, index };
  });

  // Helper to generate a smooth Bezier Curve path
  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 3;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (2 * (next.x - curr.x)) / 3;
      const cpY2 = next.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const fillPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : "";

  // Bottom Summary stats
  const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.revenue, 0);
  const averageRevenue =
    revenueData.length > 0 ? totalRevenue / revenueData.length : 0;

  let highestItem: RevenueItem | null = null;
  let lowestItem: RevenueItem | null = null;
  if (revenueData.length > 0) {
    highestItem = revenueData.reduce(
      (max, item) => (item.revenue > max.revenue ? item : max),
      revenueData[0],
    );
    lowestItem = revenueData.reduce(
      (min, item) => (item.revenue < min.revenue ? item : min),
      revenueData[0],
    );
  }

  const filteredOrders = recentOrders.filter((order) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_email.toLowerCase().includes(query) ||
      order.concert_name.toLowerCase().includes(query) ||
      order.order_id.toLowerCase().includes(query) ||
      order.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Metrics Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Events */}
        <div className="bg-surface p-6 rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform duration-300 relative overflow-hidden group">
          <div className="absolute inset-0 bg-linear-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
          <div className="absolute inset-0 bg-linear-to-br from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
          <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
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
          <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <p className="text-muted-foreground font-body text-xs font-semibold uppercase tracking-wider mb-1">
            Registered Users
          </p>
          <h3 className="font-display text-4xl font-extrabold text-indigo-600">
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

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <section className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[460px]">
          <div className="flex flex-row justify-between items-center mb-6">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Revenue over time
              </h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                <span>Revenue (VND)</span>
              </div>

              {/* CSV Export Button */}
              <button
                onClick={() => {
                  const headers = [
                    "Period",
                    "Revenue (VND)",
                    "Paid Orders",
                    "Tickets Sold",
                  ];
                  const rows = revenueData.map((item) => [
                    item.period,
                    item.revenue,
                    item.paid_orders,
                    item.tickets_sold,
                  ]);
                  const csvContent =
                    "data:text/csv;charset=utf-8," +
                    [headers.join(","), ...rows.map((e) => e.join(","))].join(
                      "\n",
                    );
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute(
                    "download",
                    `revenue_report_${groupBy}_${new Date().toISOString().slice(0, 10)}.csv`,
                  );
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary text-foreground hover:text-primary font-body text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                Export
              </button>
            </div>
          </div>

          {/* Filtering Controls Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6 pb-6 border-b border-border/50">
            {/* Date Range Picker */}
            <div className="md:col-span-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Date range
              </span>
              <div
                onClick={() => fromDateRef.current?.showPicker()}
                className="flex items-center gap-1.5 bg-background border border-border rounded-xl px-2.5 py-2 text-sm text-foreground hover:border-primary/50 transition-all cursor-pointer"
              >
                <input
                  ref={fromDateRef}
                  type="date"
                  value={tempFromDate}
                  onClick={(e) => {
                    e.stopPropagation();
                    fromDateRef.current?.showPicker();
                  }}
                  onChange={(e) => setTempFromDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="bg-transparent text-foreground focus:outline-none w-[110px] min-w-0 font-body text-xs cursor-pointer text-center px-1"
                />
                <span className="text-muted-foreground font-bold text-xs select-none">
                  →
                </span>
                <input
                  ref={toDateRef}
                  type="date"
                  value={tempToDate}
                  onClick={(e) => {
                    e.stopPropagation();
                    toDateRef.current?.showPicker();
                  }}
                  onChange={(e) => setTempToDate(e.target.value)}
                  style={{ colorScheme: "dark" }}
                  className="bg-transparent text-foreground focus:outline-none w-[110px] min-w-0 font-body text-xs cursor-pointer text-center px-1"
                />
              </div>
            </div>

            {/* Group By Filter */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Group by
              </span>
              <select
                value={tempGroupBy}
                onChange={(e) =>
                  setTempGroupBy(e.target.value as "day" | "week" | "month")
                }
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full transition-all cursor-pointer"
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
            </div>

            {/* Concert Status Filter */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Concert Status
              </span>
              <select
                value={tempStatus}
                onChange={(e) => setTempStatus(e.target.value)}
                className="bg-background border border-border rounded-xl px-4 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full transition-all cursor-pointer"
              >
                <option value="All">All</option>
                <option value="DRAFT">DRAFT</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="COMING_SOON">COMING SOON</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-4 flex items-center gap-3">
              <button
                onClick={handleReset}
                className="flex-1 bg-surface-high hover:bg-surface-high/80 text-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl border border-border transition-all active:scale-95 duration-150"
              >
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95 duration-150"
              >
                Apply
              </button>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="grow relative min-h-[250px] w-full">
            {isLoadingRevenue ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : revenueData.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-body text-sm">
                No revenue recorded in this period.
              </div>
            ) : (
              <>
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  width="100%"
                  height="100%"
                  className="overflow-visible select-none"
                >
                  <defs>
                    <linearGradient
                      id="chart-gradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#3b82f6"
                        stopOpacity="0.25"
                      />
                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {yLabels.map((val, idx) => {
                    const y =
                      paddingTop + (idx / (yLabels.length - 1)) * chartHeight;
                    return (
                      <g key={idx}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgWidth - paddingRight}
                          y2={y}
                          stroke="var(--color-border)"
                          strokeOpacity={0.2}
                          strokeDasharray={
                            idx === yLabels.length - 1 ? "" : "4 4"
                          }
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 4}
                          fill="var(--color-muted-foreground)"
                          fontSize={10}
                          textAnchor="end"
                          fontFamily="var(--font-body)"
                        >
                          {formatYAxisLabel(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* SVG Area Path with gradient */}
                  {fillPath && (
                    <path d={fillPath} fill="url(#chart-gradient)" />
                  )}

                  {/* SVG Spline Curve Path */}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive vertical hover indicator line */}
                  {hoveredIndex !== null && points[hoveredIndex] && (
                    <line
                      x1={points[hoveredIndex].x}
                      y1={paddingTop}
                      x2={points[hoveredIndex].x}
                      y2={paddingTop + chartHeight}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Data Point Circles */}
                  {points.map((pt, idx) => (
                    <circle
                      key={idx}
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredIndex === idx ? 6 : 3}
                      fill={
                        hoveredIndex === idx
                          ? "#3b82f6"
                          : "var(--color-surface)"
                      }
                      stroke="#3b82f6"
                      strokeWidth={2}
                      className="transition-all duration-75"
                    />
                  ))}

                  {/* X-axis labels at bottom */}
                  {points.map((pt, idx) => {
                    // Filter subset of labels to prevent overlapping
                    const showLabel =
                      points.length <= 15 ||
                      idx % Math.ceil(points.length / 8) === 0 ||
                      idx === points.length - 1;
                    if (!showLabel) return null;
                    return (
                      <text
                        key={idx}
                        x={pt.x}
                        y={svgHeight - 12}
                        fill="var(--color-muted-foreground)"
                        fontSize={10}
                        textAnchor="middle"
                        fontFamily="var(--font-body)"
                      >
                        {formatXAxisLabel(pt.item.period, groupBy)}
                      </text>
                    );
                  })}

                  {/* Invisible hit zones for smooth hovering */}
                  {points.map((pt, idx) => {
                    const rectWidth =
                      chartWidth / Math.max(points.length - 1, 1);
                    const xStart = pt.x - rectWidth / 2;
                    return (
                      <rect
                        key={idx}
                        x={xStart}
                        y={paddingTop}
                        width={rectWidth}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })}
                </svg>

                {/* Absolute Tooltip Panel */}
                {hoveredIndex !== null && points[hoveredIndex] && (
                  <div
                    className="absolute z-20 bg-surface border border-border p-3 rounded-xl shadow-lg pointer-events-none transition-all duration-75 text-xs text-foreground"
                    style={{
                      left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
                      top: `${(points[hoveredIndex].y / svgHeight) * 100 - 15}%`,
                      transform: "translate(-50%, -100%)",
                    }}
                  >
                    <div className="font-semibold text-muted-foreground">
                      {formatDateSubtext(points[hoveredIndex].item.period)}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 font-bold text-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      Revenue (VND):{" "}
                      {new Intl.NumberFormat("vi-VN").format(
                        points[hoveredIndex].item.revenue,
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Statistics Cards Row */}
          {!isLoadingRevenue && revenueData.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border mt-6 pt-6 gap-4 sm:gap-0">
              {/* Total revenue */}
              <div className="flex flex-col items-center sm:items-start sm:px-4 pb-4 sm:pb-0 justify-center">
                <span className="text-xs text-muted-foreground mb-1">
                  Total revenue
                </span>
                <span className="text-lg font-black text-foreground">
                  {formatValueVND(totalRevenue)}
                </span>
              </div>

              {/* Average per period */}
              <div className="flex flex-col items-center sm:items-start sm:px-4 py-4 sm:py-0 justify-center">
                <span className="text-xs text-muted-foreground mb-1">
                  Average per {groupBy}
                </span>
                <span className="text-lg font-black text-foreground">
                  {formatValueVND(averageRevenue)}
                </span>
              </div>

              {/* Highest period */}
              <div className="flex flex-col items-center sm:items-start sm:px-4 py-4 sm:py-0 justify-center">
                <span className="text-xs text-muted-foreground mb-1">
                  Highest {groupBy}
                </span>
                {highestItem && (
                  <>
                    <span className="text-lg font-black text-foreground">
                      {formatValueVND(highestItem.revenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      {formatDateSubtext(highestItem.period)}
                    </span>
                  </>
                )}
              </div>

              {/* Lowest period */}
              <div className="flex flex-col items-center sm:items-start sm:px-4 pt-4 sm:pt-0 justify-center">
                <span className="text-xs text-muted-foreground mb-1">
                  Lowest {groupBy}
                </span>
                {lowestItem && (
                  <>
                    <span className="text-lg font-black text-foreground">
                      {formatValueVND(lowestItem.revenue)}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      {formatDateSubtext(lowestItem.period)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Recent Orders List Widget */}
        <aside className="lg:col-span-1 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[400px] max-h-[500px]">
          <div className="flex flex-col gap-2 pb-4 border-b border-border mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                Recent Orders
              </h3>
              <span className="font-body text-[10px] font-semibold text-muted-foreground bg-surface-high px-2 py-0.5 rounded">
                Live Feed
              </span>
            </div>
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                className="pl-8 pr-2 py-1.5 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full transition-all"
                placeholder="Search orders..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto grow pr-1 scrollbar-thin">
            {isLoadingOrders ? (
              <div className="py-8 text-center text-muted-foreground">
                <div className="flex items-center justify-center gap-2 text-xs">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading...
                </div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
                No orders found.
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-3 bg-background rounded-lg border border-border flex flex-col gap-1.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      #{order.order_id.slice(0, 8)}
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-body text-[9px] font-semibold border ${
                        order.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : order.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : order.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-surface-highest text-foreground border-border"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div>
                    <h4
                      className="font-body text-xs font-bold text-foreground truncate"
                      title={order.customer_name}
                    >
                      {order.customer_name}
                    </h4>
                    <p className="text-muted-foreground text-[10px] truncate">
                      {order.customer_email}
                    </p>
                  </div>
                  <div
                    className="text-[11px] font-semibold text-foreground truncate"
                    title={order.concert_name}
                  >
                    {order.concert_name}
                  </div>
                  <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground">
                      {order.ticket_count}{" "}
                      {order.ticket_count === 1 ? "ticket" : "tickets"} •{" "}
                      {formatConcertCurrency(order.total_amount)}
                    </span>
                    <Link
                      href={`/orders/${order.order_id}`}
                      className="text-[10px] font-bold text-primary hover:underline"
                    >
                      Details →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full mt-4 py-2 border border-border hover:border-primary text-foreground hover:text-primary font-body text-xs font-semibold rounded-lg transition-colors text-center"
          >
            View All Orders
          </button>
        </aside>
      </div>

      {/* All Orders Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-surface w-full max-w-5xl rounded-xl border border-border shadow-lg flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-high/50">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  All System Orders
                </h3>
                <p className="text-muted-foreground font-body text-xs mt-0.5">
                  Browse, search, and monitor all client order records
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-surface-high rounded-lg text-muted-foreground hover:text-foreground transition-colors font-body text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Filters */}
            <div className="p-4 border-b border-border bg-background/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="pl-10 pr-4 py-2 border border-border rounded-lg bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-sm w-full transition-all"
                  placeholder="Search by ID, customer name/email, concert..."
                  type="text"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <span className="text-xs text-muted-foreground font-body font-semibold">
                  Status:
                </span>
                <select
                  value={modalStatusFilter}
                  onChange={(e) => {
                    setModalStatusFilter(e.target.value);
                    setModalPage(1);
                  }}
                  className="px-3 py-1.5 border border-border rounded-lg bg-surface font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground font-semibold"
                >
                  <option value="">All Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto grow p-6">
              {isModalLoading ? (
                <div className="py-20 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <span className="font-body text-sm">
                      Fetching all order records...
                    </span>
                  </div>
                </div>
              ) : modalOrders.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground font-body text-sm">
                  No orders matched the specified filters.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-background font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="p-3 border-b border-border">Order ID</th>
                      <th className="p-3 border-b border-border">Customer</th>
                      <th className="p-3 border-b border-border">Concert</th>
                      <th className="p-3 border-b border-border text-center">
                        Tickets
                      </th>
                      <th className="p-3 border-b border-border">Amount</th>
                      <th className="p-3 border-b border-border">Status</th>
                      <th className="p-3 border-b border-border">Date</th>
                      <th className="p-3 border-b border-border text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-body text-sm divide-y divide-border">
                    {modalOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-surface-high/50 transition-colors"
                      >
                        <td className="p-3 font-mono text-xs text-foreground font-semibold">
                          #{order.id.slice(0, 8)}...
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-semibold text-foreground">
                              {order.user_name || "Unknown Customer"}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                              {order.user_email}
                            </p>
                          </div>
                        </td>
                        <td
                          className="p-3 font-semibold text-foreground max-w-[150px] truncate"
                          title={order.concert_name}
                        >
                          {order.concert_name}
                        </td>
                        <td className="p-3 text-center font-semibold text-foreground">
                          {order.ticket_count}
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {formatConcertCurrency(Number(order.total_amount))}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-body text-[10px] font-semibold border ${
                              order.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : order.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : order.status === "CANCELLED"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-surface-highest text-foreground border-border"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {new Date(order.created_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="p-3 text-center">
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            onClick={() => setIsModalOpen(false)}
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer / Pagination */}
            {!isModalLoading && modalTotalPages > 1 && (
              <div className="p-4 border-t border-border bg-surface-high/30 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-body font-semibold">
                  Page {modalPage} of {modalTotalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={modalPage <= 1}
                    onClick={() =>
                      setModalPage((prev) => Math.max(prev - 1, 1))
                    }
                    className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all"
                  >
                    Previous
                  </button>
                  <button
                    disabled={modalPage >= modalTotalPages}
                    onClick={() =>
                      setModalPage((prev) =>
                        Math.min(prev + 1, modalTotalPages),
                      )
                    }
                    className="px-3 py-1.5 border border-border rounded-lg font-body text-xs font-semibold hover:bg-surface-high disabled:opacity-50 disabled:hover:bg-transparent text-foreground transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
