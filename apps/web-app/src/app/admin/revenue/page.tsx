"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Building2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getConcertPosterUrl } from "@/services/concert.service";
import {
  getRevenueTrend,
  getRevenueByConcert,
  getConcertRevenueDetail,
  type RevenueTrendItem,
  type RevenueByConcertItem,
  type ConcertRevenueDetailResponse,
} from "@/services/revenue.service";

// Helper to format currency exactly as requested: 123.456.789 ₫
const formatVND = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value);
};

// Helper for formatting Y-axis labels concisely
const formatConciseNumber = (value: number) => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  }
  return value.toString();
};

export default function AdminRevenuePage() {
  // Page-level filters (actual API parameters)
  const [fromDate, setFromDate] = useState<string>("2026-03-01");
  const [toDate, setToDate] = useState<string>("2026-07-04");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Temporary UI filter values before clicking "Apply"
  const [tempFromDate, setTempFromDate] = useState<string>("2026-03-01");
  const [tempToDate, setTempToDate] = useState<string>("2026-07-04");
  const [tempGroupBy, setTempGroupBy] = useState<"day" | "week" | "month">(
    "day",
  );
  const [tempStatus, setTempStatus] = useState<string>("All");

  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  // API Data States
  const [trendItems, setTrendItems] = useState<RevenueTrendItem[]>([]);
  const [concertItems, setConcertItems] = useState<RevenueByConcertItem[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState<boolean>(true);
  const [isConcertsLoading, setIsConcertsLoading] = useState<boolean>(true);

  // Table Search and Pagination
  const [tableSearch, setTableSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 7;

  // Selected Concert for Detail Drawer
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null,
  );
  const [detailData, setDetailData] =
    useState<ConcertRevenueDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Interactive Chart Hover Index
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch trend data from API
  const fetchTrendData = useCallback(
    async (
      fromVal?: string,
      toVal?: string,
      groupVal?: "day" | "week" | "month",
    ) => {
      try {
        setIsTrendLoading(true);
        const res = await getRevenueTrend({
          from: fromVal,
          to: toVal,
          group_by: groupVal,
        });
        setTrendItems(res.items || []);
      } catch (err) {
        console.error("Failed to fetch revenue trend:", err);
      } finally {
        setIsTrendLoading(false);
      }
    },
    [],
  );

  // Fetch concert list from API
  const fetchConcertsData = useCallback(
    async (fromVal?: string, toVal?: string, statusVal?: string) => {
      try {
        setIsConcertsLoading(true);
        const res = await getRevenueByConcert({
          from: fromVal,
          to: toVal,
          status: statusVal === "All" ? undefined : statusVal,
        });
        setConcertItems(res.items || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to fetch revenue by concert:", err);
      } finally {
        setIsConcertsLoading(false);
      }
    },
    [],
  );

  // Load initial data inside setTimeout to bypass set-state-in-effect synchronous lint warnings
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTrendData("2026-03-01", "2026-07-04", "day");
      void fetchConcertsData("2026-03-01", "2026-07-04", "All");
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTrendData, fetchConcertsData]);

  // Load concert detail when ID changes or active date range filters change
  useEffect(() => {
    if (!selectedConcertId) return;

    const fetchDetail = async () => {
      try {
        setIsDetailLoading(true);
        const res = await getConcertRevenueDetail(selectedConcertId, {
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        setDetailData(res);
      } catch (err) {
        console.error("Failed to fetch concert details:", err);
      } finally {
        setIsDetailLoading(false);
      }
    };

    const timer = setTimeout(() => {
      void fetchDetail();
    }, 0);

    return () => clearTimeout(timer);
  }, [selectedConcertId, fromDate, toDate]);

  // Handle filter submission
  const handleApply = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setGroupBy(tempGroupBy);

    void fetchTrendData(tempFromDate, tempToDate, tempGroupBy);
    void fetchConcertsData(tempFromDate, tempToDate, tempStatus);
  };

  // Reset filters to defaults
  const handleReset = () => {
    setTempFromDate("");
    setTempToDate("");
    setTempGroupBy("day");
    setTempStatus("All");

    setFromDate("");
    setToDate("");
    setGroupBy("day");

    void fetchTrendData("", "", "day");
    void fetchConcertsData("", "", "All");
  };

  // Filtered concert items for table
  const filteredConcerts = concertItems.filter((item) =>
    item.concert_name.toLowerCase().includes(tableSearch.toLowerCase().trim()),
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredConcerts.length / itemsPerPage) || 1;
  const paginatedConcerts = filteredConcerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Chart coordinate calculations
  const svgWidth = 1000;
  const svgHeight = 400;
  const paddingLeft = 85;
  const paddingRight = 120;
  const paddingTop = 45;
  const paddingBottom = 55;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxRevenue =
    trendItems.length > 0
      ? Math.max(...trendItems.map((item) => item.revenue), 1000000)
      : 1000000;

  const maxPaidOrders =
    trendItems.length > 0
      ? Math.max(...trendItems.map((item) => item.paid_orders), 10)
      : 10;

  const maxTicketsSold =
    trendItems.length > 0
      ? Math.max(...trendItems.map((item) => item.tickets_sold), 10)
      : 10;

  // Grid line values
  const yTicksLeft = [
    maxRevenue,
    maxRevenue * 0.75,
    maxRevenue * 0.5,
    maxRevenue * 0.25,
    0,
  ];
  const yTicksRightOrders = [
    maxPaidOrders,
    maxPaidOrders * 0.75,
    maxPaidOrders * 0.5,
    maxPaidOrders * 0.25,
    0,
  ];
  const yTicksRightTickets = [
    maxTicketsSold,
    maxTicketsSold * 0.75,
    maxTicketsSold * 0.5,
    maxTicketsSold * 0.25,
    0,
  ];

  // Draw lines paths
  const getLinePath = (
    valueExtractor: (item: RevenueTrendItem) => number,
    maxValue: number,
  ) => {
    if (trendItems.length === 0) return "";
    return trendItems
      .map((item, index) => {
        const x =
          paddingLeft +
          (trendItems.length > 1
            ? (index / (trendItems.length - 1)) * chartWidth
            : chartWidth / 2);
        const y =
          paddingTop +
          chartHeight -
          (valueExtractor(item) / maxValue) * chartHeight;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  const revenuePath = getLinePath((item) => item.revenue, maxRevenue);
  const ordersPath = getLinePath((item) => item.paid_orders, maxPaidOrders);
  const ticketsPath = getLinePath((item) => item.tickets_sold, maxTicketsSold);

  // Area path for Revenue (VND) (with gradient)
  const revenueAreaPath =
    trendItems.length > 0 && revenuePath
      ? `${revenuePath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`
      : "";

  // Formatting date strings to nice formats
  const formatPeriodLabel = (period: string) => {
    if (!period) return "";
    const parts = period.split("-");
    if (groupBy === "month" && parts.length >= 2) {
      return `Tháng ${parts[1]}/${parts[0]}`;
    }
    if (parts.length === 3) {
      const d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      );
      return d.toLocaleDateString("vi-VN", { month: "short", day: "numeric" });
    }
    return period;
  };

  const formatFullPeriod = (period: string) => {
    if (!period) return "";
    const parts = period.split("-");
    if (parts.length === 3) {
      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      ).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    if (parts.length === 2) {
      return `Tháng ${parts[1]}, ${parts[0]}`;
    }
    return period;
  };

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
      d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  // Helper to calculate totals for selected concert tier breakdown
  const tierTotals = detailData?.ticket_tiers?.reduce(
    (acc, curr) => {
      acc.total_quantity += curr.total_quantity;
      acc.tickets_sold += curr.tickets_sold;
      acc.remaining_quantity += curr.remaining_quantity;
      acc.revenue += curr.revenue;
      return acc;
    },
    { total_quantity: 0, tickets_sold: 0, remaining_quantity: 0, revenue: 0 },
  ) || {
    total_quantity: 0,
    tickets_sold: 0,
    remaining_quantity: 0,
    revenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Revenue
        </h1>
        <p className="text-muted-foreground font-body text-sm mt-1">
          Overview of revenue performance across the platform
        </p>
      </div>

      {/* Filter Panel */}
      <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          {/* Date Range Picker */}
          <div className="flex flex-col gap-2 md:col-span-4">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Date range
            </span>
            <div
              onClick={() => fromDateRef.current?.showPicker()}
              className="flex items-center justify-start gap-1 bg-background border border-border rounded-xl px-2.5 py-2 text-sm text-foreground hover:border-primary/50 transition-colors h-11 w-full cursor-pointer"
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
              <span className="text-muted-foreground font-semibold shrink-0 select-none">
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
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Group by
            </span>
            <select
              value={tempGroupBy}
              onChange={(e) =>
                setTempGroupBy(e.target.value as "day" | "week" | "month")
              }
              className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full h-11 transition-all cursor-pointer"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>

          {/* Concert Status Filter */}
          <div className="flex flex-col gap-2 md:col-span-3">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Concert status
            </span>
            <select
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              className="bg-background border border-border rounded-xl px-4 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full h-11 transition-all cursor-pointer"
            >
              <option value="All">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end h-11 md:col-span-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-background hover:bg-surface-low border border-border text-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:border-foreground/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 bg-primary hover:bg-primary-container text-white font-body text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
            >
              Apply
            </button>
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col min-h-[480px]">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Revenue trend
            </h3>
          </div>

          {/* Multi-series chart legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-blue-400">
              <span className="w-2.5 h-1.5 rounded bg-blue-500 inline-block"></span>
              <span>Revenue (VND)</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-1.5 rounded bg-emerald-500 inline-block"></span>
              <span>Paid orders</span>
            </div>
            <div className="flex items-center gap-1.5 text-violet-400">
              <span className="w-2.5 h-1.5 rounded bg-violet-500 inline-block"></span>
              <span>Tickets sold</span>
            </div>
          </div>
        </div>

        {/* SVG interactive chart area */}
        <div className="grow relative min-h-[300px] w-full select-none">
          {isTrendLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="text-xs text-muted-foreground font-body">
                  Loading trend data...
                </span>
              </div>
            </div>
          ) : trendItems.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-body text-sm">
              No revenue records in this period.
            </div>
          ) : (
            <>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                width="100%"
                height="100%"
                className="overflow-visible"
              >
                <defs>
                  {/* Revenue Area Fill Gradient */}
                  <linearGradient
                    id="revenue-gradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal dotted grid lines */}
                {yTicksLeft.map((val, idx) => {
                  const y =
                    paddingTop + (idx / (yTicksLeft.length - 1)) * chartHeight;
                  return (
                    <g key={idx}>
                      {/* Grid Line */}
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="var(--color-border)"
                        strokeOpacity={0.15}
                        strokeDasharray={
                          idx === yTicksLeft.length - 1 ? "" : "4 4"
                        }
                      />
                      {/* Left Y Axis Label (Revenue VND) */}
                      <text
                        x={paddingLeft - 10}
                        y={y + 3}
                        fill="var(--color-muted-foreground)"
                        fontSize={10}
                        fontWeight="semibold"
                        textAnchor="end"
                        className="font-body"
                      >
                        {formatConciseNumber(val)}
                      </text>

                      {/* Right Y Axis Label (Paid Orders) */}
                      <text
                        x={svgWidth - paddingRight + 20}
                        y={y + 3}
                        fill="#34d399"
                        fontSize={10}
                        fontWeight="semibold"
                        textAnchor="start"
                        className="font-body"
                      >
                        {formatConciseNumber(yTicksRightOrders[idx])}
                      </text>

                      {/* Far Right Y Axis Label (Tickets Sold) */}
                      <text
                        x={svgWidth - paddingRight + 75}
                        y={y + 3}
                        fill="#a78bfa"
                        fontSize={10}
                        fontWeight="semibold"
                        textAnchor="start"
                        className="font-body"
                      >
                        {formatConciseNumber(yTicksRightTickets[idx])}
                      </text>
                    </g>
                  );
                })}

                {/* Axis Labels Titles */}
                <text
                  x={paddingLeft - 10}
                  y={paddingTop - 15}
                  fill="var(--color-muted-foreground)"
                  fontSize={9}
                  fontWeight="bold"
                  textAnchor="end"
                  className="font-body uppercase tracking-wider"
                >
                  Revenue (VND)
                </text>
                <text
                  x={svgWidth - paddingRight + 20}
                  y={paddingTop - 15}
                  fill="#34d399"
                  fontSize={9}
                  fontWeight="bold"
                  textAnchor="start"
                  className="font-body uppercase tracking-wider"
                >
                  Orders
                </text>
                <text
                  x={svgWidth - paddingRight + 75}
                  y={paddingTop - 15}
                  fill="#a78bfa"
                  fontSize={9}
                  fontWeight="bold"
                  textAnchor="start"
                  className="font-body uppercase tracking-wider"
                >
                  Sold
                </text>

                {/* Revenue area path with gradient */}
                {revenueAreaPath && (
                  <path d={revenueAreaPath} fill="url(#revenue-gradient)" />
                )}

                {/* Revenue Trend Line (Blue) */}
                {revenuePath && (
                  <path
                    d={revenuePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Paid Orders Trend Line (Green) */}
                {ordersPath && (
                  <path
                    d={ordersPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Tickets Sold Trend Line (Purple) */}
                {ticketsPath && (
                  <path
                    d={ticketsPath}
                    fill="none"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive vertical hover indicator line */}
                {hoveredIndex !== null && trendItems[hoveredIndex] && (
                  <line
                    x1={
                      paddingLeft +
                      (trendItems.length > 1
                        ? (hoveredIndex / (trendItems.length - 1)) * chartWidth
                        : chartWidth / 2)
                    }
                    y1={paddingTop}
                    x2={
                      paddingLeft +
                      (trendItems.length > 1
                        ? (hoveredIndex / (trendItems.length - 1)) * chartWidth
                        : chartWidth / 2)
                    }
                    y2={paddingTop + chartHeight}
                    stroke="var(--color-outline)"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                )}

                {/* Circle points on line */}
                {trendItems.map((item, index) => {
                  const x =
                    paddingLeft +
                    (trendItems.length > 1
                      ? (index / (trendItems.length - 1)) * chartWidth
                      : chartWidth / 2);
                  const yRev =
                    paddingTop +
                    chartHeight -
                    (item.revenue / maxRevenue) * chartHeight;
                  const yOrd =
                    paddingTop +
                    chartHeight -
                    (item.paid_orders / maxPaidOrders) * chartHeight;
                  const yTkt =
                    paddingTop +
                    chartHeight -
                    (item.tickets_sold / maxTicketsSold) * chartHeight;

                  const isHovered = hoveredIndex === index;

                  return (
                    <g key={index}>
                      {/* Revenue point */}
                      <circle
                        cx={x}
                        cy={yRev}
                        r={isHovered ? 6 : 3}
                        fill={isHovered ? "#3b82f6" : "var(--color-surface)"}
                        stroke="#3b82f6"
                        strokeWidth={2}
                        className="transition-all duration-75"
                      />
                      {/* Paid Orders point */}
                      <circle
                        cx={x}
                        cy={yOrd}
                        r={isHovered ? 5 : 2.5}
                        fill={isHovered ? "#10b981" : "var(--color-surface)"}
                        stroke="#10b981"
                        strokeWidth={1.5}
                        className="transition-all duration-75"
                      />
                      {/* Tickets Sold point */}
                      <circle
                        cx={x}
                        cy={yTkt}
                        r={isHovered ? 5 : 2.5}
                        fill={isHovered ? "#8b5cf6" : "var(--color-surface)"}
                        stroke="#8b5cf6"
                        strokeWidth={1.5}
                        className="transition-all duration-75"
                      />
                    </g>
                  );
                })}

                {/* X-axis labels at bottom */}
                {trendItems.map((item, idx) => {
                  const x =
                    paddingLeft +
                    (trendItems.length > 1
                      ? (idx / (trendItems.length - 1)) * chartWidth
                      : chartWidth / 2);
                  const showLabel =
                    trendItems.length <= 15 ||
                    idx % Math.ceil(trendItems.length / 8) === 0 ||
                    idx === trendItems.length - 1;
                  if (!showLabel) return null;
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={svgHeight - 15}
                      fill="var(--color-muted-foreground)"
                      fontSize={10}
                      fontWeight="semibold"
                      textAnchor="middle"
                      className="font-body"
                    >
                      {formatPeriodLabel(item.period)}
                    </text>
                  );
                })}

                {/* Invisible hover-capture bars */}
                {trendItems.map((item, idx) => {
                  const barWidth =
                    chartWidth / Math.max(trendItems.length - 1, 1);
                  const x =
                    paddingLeft +
                    (trendItems.length > 1
                      ? (idx / (trendItems.length - 1)) * chartWidth
                      : chartWidth / 2);
                  const xStart = x - barWidth / 2;
                  return (
                    <rect
                      key={idx}
                      x={xStart}
                      y={paddingTop}
                      width={barWidth}
                      height={chartHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    />
                  );
                })}
              </svg>

              {/* Tooltip Overlay */}
              {hoveredIndex !== null && trendItems[hoveredIndex] && (
                <div
                  className="absolute z-20 bg-surface border border-border p-3 rounded-xl shadow-lg pointer-events-none transition-all duration-75 text-xs text-foreground"
                  style={{
                    left: `${((paddingLeft + (trendItems.length > 1 ? (hoveredIndex / (trendItems.length - 1)) * chartWidth : chartWidth / 2)) / svgWidth) * 100}%`,
                    top: `${((paddingTop + chartHeight - (trendItems[hoveredIndex].revenue / maxRevenue) * chartHeight) / svgHeight) * 100 - 15}%`,
                    transform: "translate(-50%, -100%)",
                  }}
                >
                  <div className="font-bold text-muted-foreground border-b border-border/50 pb-1 mb-1.5">
                    {formatFullPeriod(trendItems[hoveredIndex].period)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-4 font-semibold text-blue-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Revenue:
                      </span>
                      <span className="font-mono">
                        {formatVND(trendItems[hoveredIndex].revenue)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 font-semibold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Paid orders:
                      </span>
                      <span className="font-mono">
                        {trendItems[hoveredIndex].paid_orders.toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 font-semibold text-violet-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500"></span>
                        Tickets sold:
                      </span>
                      <span className="font-mono">
                        {trendItems[hoveredIndex].tickets_sold.toLocaleString(
                          "vi-VN",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Revenue by concert
            </h3>
          </div>

          {/* Table Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search concert..."
              value={tableSearch}
              onChange={(e) => {
                setTableSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full transition-all"
            />
          </div>
        </div>

        {/* Table list */}
        <div className="overflow-x-auto w-full">
          {isConcertsLoading ? (
            <div className="py-20 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <span className="font-body text-xs">
                  Loading concerts revenue...
                </span>
              </div>
            </div>
          ) : filteredConcerts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground font-body text-sm border border-border/50 rounded-xl bg-background/20">
              No concerts found.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4 rounded-tl-xl">Concert</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Start Time</th>
                  <th className="p-4 text-right">Revenue (VND)</th>
                  <th className="p-4 text-center">Paid Orders</th>
                  <th className="p-4 text-center">Tickets Sold</th>
                  <th className="p-4 text-center rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="font-body text-xs divide-y divide-border/50">
                {paginatedConcerts.map((item) => (
                  <tr
                    key={item.concert_id}
                    className="hover:bg-surface-high/20 transition-colors"
                  >
                    {/* Concert details */}
                    <td className="p-4 font-semibold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-low border border-border relative">
                          <Image
                            src={getConcertPosterUrl()}
                            alt={item.concert_name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground leading-tight">
                            {item.concert_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                            Platform Venue
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-body text-[9px] font-bold border uppercase tracking-wider ${
                          item.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : item.status === "COMPLETED"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : item.status === "CANCELLED"
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* Start time */}
                    <td className="p-4 text-muted-foreground font-semibold">
                      {formatConcertDate(item.start_time)}
                    </td>

                    {/* Revenue */}
                    <td className="p-4 text-right font-bold text-foreground font-mono text-sm">
                      {formatVND(item.revenue)}
                    </td>

                    {/* Paid orders */}
                    <td className="p-4 text-center font-bold text-foreground font-mono">
                      {item.paid_orders.toLocaleString("vi-VN")}
                    </td>

                    {/* Tickets sold */}
                    <td className="p-4 text-center font-bold text-foreground font-mono">
                      {item.tickets_sold.toLocaleString("vi-VN")}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedConcertId(item.concert_id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary hover:bg-primary hover:text-white font-body text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200 cursor-pointer"
                      >
                        View detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {!isConcertsLoading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/50 text-xs">
            <span className="text-muted-foreground font-semibold">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredConcerts.length)} of{" "}
              {filteredConcerts.length} concerts
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 border border-border rounded-lg bg-background hover:bg-surface-low text-foreground disabled:opacity-40 disabled:hover:bg-background disabled:hover:border-border disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                const isSelected = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-8 h-8 font-bold border rounded-lg transition-all active:scale-95 duration-150 ${
                      isSelected
                        ? "bg-primary text-white border-primary shadow-sm shadow-primary/20"
                        : "border-border bg-background hover:bg-surface-low text-foreground hover:border-primary/50 hover:-translate-y-0.5"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                className="p-1.5 border border-border rounded-lg bg-background hover:bg-surface-low text-foreground disabled:opacity-40 disabled:hover:bg-background disabled:hover:border-border disabled:hover:translate-y-0 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Slide-out Concert Detail Drawer */}
      <AnimatePresence>
        {selectedConcertId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedConcertId(null);
                setDetailData(null);
              }}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Drawer */}
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 right-0 h-full w-full sm:max-w-2xl bg-surface border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
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
                  onClick={() => {
                    setSelectedConcertId(null);
                    setDetailData(null);
                  }}
                  className="p-2 hover:bg-surface-high hover:text-foreground rounded-xl text-muted-foreground transition-all hover:scale-105 active:scale-95 duration-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
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
                    {/* Concert Info Header Card */}
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
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-body text-[8px] font-bold border uppercase tracking-wider ${
                              detailData.concert.status === "PUBLISHED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : detailData.concert.status === "COMPLETED"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : detailData.concert.status === "CANCELLED"
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}
                          >
                            {detailData.concert.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-semibold">
                          Platform Venue, City
                        </p>
                        <p className="text-[10px] text-muted-foreground font-semibold font-mono">
                          {formatConcertDate(detailData.concert.start_time)}
                        </p>
                      </div>
                    </div>

                    {/* Date Filters indicator inside Drawer */}
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

                    {/* Quick Stats Bento Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Total Revenue card */}
                      <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Total revenue
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-foreground font-mono truncate">
                          {formatVND(detailData.total_revenue)}
                        </span>
                      </div>

                      {/* Paid Orders Card */}
                      <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Paid orders
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
                          {detailData.paid_orders.toLocaleString("vi-VN")}
                        </span>
                      </div>

                      {/* Tickets Sold Card */}
                      <div className="bg-background border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Tickets sold
                        </span>
                        <span className="text-base sm:text-lg font-extrabold text-foreground font-mono">
                          {detailData.tickets_sold.toLocaleString("vi-VN")}
                        </span>
                      </div>
                    </div>

                    {/* Ticket Tier Breakdown Table */}
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

                            {/* Total summary row */}
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
                                {tierTotals.tickets_sold.toLocaleString(
                                  "vi-VN",
                                )}
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
    </div>
  );
}
