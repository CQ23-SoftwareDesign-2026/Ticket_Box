"use client";

import { useState, useEffect, useRef } from "react";
import { formatConcertCurrency } from "@/services/concert.service";
import {
  getDashboardSummary,
  getDashboardRevenue,
  getDashboardRecentOrders,
  type DashboardSummary,
  type RevenueItem,
  type RecentOrder,
} from "@/services/dashboard.service";


export function useAdminDashboard() {
  // Summary & orders
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueItem[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingRevenue, setIsLoadingRevenue] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Chart filters
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");
  const [fromDate, setFromDate] = useState<string>("2026-03-01");
  const [toDate, setToDate] = useState<string>("2026-07-04");
  const [tempFromDate, setTempFromDate] = useState<string>("2026-03-01");
  const [tempToDate, setTempToDate] = useState<string>("2026-07-04");
  const [tempGroupBy, setTempGroupBy] = useState<"day" | "week" | "month">(
    "day",
  );
  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  // Chart hover
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);



  // Load summary and recent orders
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

  // Load revenue chart data on filter change
  useEffect(() => {
    async function loadRevenue() {
      try {
        setIsLoadingRevenue(true);
        const data = await getDashboardRevenue({
          group_by: groupBy,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        setRevenueData(data);
      } catch (err) {
        console.error("Failed to load revenue trend", err);
      } finally {
        setIsLoadingRevenue(false);
      }
    }
    loadRevenue();
  }, [groupBy, fromDate, toDate]);



  const handleApply = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setGroupBy(tempGroupBy);
  };

  const handleReset = () => {
    setTempFromDate("2026-03-01");
    setTempToDate("2026-07-04");
    setTempGroupBy("day");
    setFromDate("2026-03-01");
    setToDate("2026-07-04");
    setGroupBy("day");
  };

  // Chart computations
  const formatSummaryNumber = (value: number, type: "number" | "currency") => {
    if (type === "number") return new Intl.NumberFormat("vi-VN").format(value);
    if (value >= 1_000_000_000)
      return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} tỷ đ`;
    if (value >= 1_000_000)
      return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} triệu đ`;
    return `${new Intl.NumberFormat("vi-VN").format(value)} đ`;
  };

  const formatValueVND = (value: number) =>
    `${new Intl.NumberFormat("vi-VN").format(Math.round(value))} đ`;

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
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ đ`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)} triệu đ`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k đ`;
    return `${value} đ`;
  };

  const formatXAxisLabel = (period: string, type: "day" | "week" | "month") => {
    if (!period) return "";
    const parts = period.split("-");
    if (type === "month" && parts.length >= 2)
      return `${parts[1]}/${parts[0].slice(2)}`;
    if (parts.length >= 3) return `${parts[2]}/${parts[1]}`;
    return period;
  };

  const formatDateSubtext = (period: string) => {
    if (!period) return "";
    const parts = period.split("-");
    if (parts.length === 3)
      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      ).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    if (parts.length === 2) return `Tháng ${parts[1]}/${parts[0]}`;
    return period;
  };

  // SVG chart values
  const svgWidth = 800;
  const svgHeight = 300;
  const paddingLeft = 75;
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

  const getBezierPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      d += ` C ${curr.x + (next.x - curr.x) / 3} ${curr.y}, ${curr.x + (2 * (next.x - curr.x)) / 3} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  const linePath = getBezierPath(points);
  const fillPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`
      : "";

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

  return {
    summary,
    isLoadingSummary,
    recentOrders,
    isLoadingOrders,
    revenueData,
    isLoadingRevenue,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    groupBy,
    fromDate,
    toDate,
    tempFromDate,
    setTempFromDate,
    tempToDate,
    setTempToDate,
    tempGroupBy,
    setTempGroupBy,
    fromDateRef,
    toDateRef,
    hoveredIndex,
    setHoveredIndex,

    handleApply,
    handleReset,
    formatSummaryNumber,
    formatValueVND,
    formatYAxisLabel,
    formatXAxisLabel,
    formatDateSubtext,
    yLabels,
    svgWidth,
    svgHeight,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingBottom,
    chartWidth,
    chartHeight,
    points,
    linePath,
    fillPath,
    totalRevenue,
    averageRevenue,
    highestItem,
    lowestItem,
    formatConcertCurrency,
  };
}
