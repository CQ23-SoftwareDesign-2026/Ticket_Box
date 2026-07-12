"use client";

import { TrendingUp } from "lucide-react";
import { type RevenueTrendItem } from "@/services/revenue.service";

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );

const formatConciseNumber = (value: number) => {
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}B`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}M`;
  if (value >= 1_000)
    return `${(value / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return value.toString();
};

interface RevenueTrendChartProps {
  trendItems: RevenueTrendItem[];
  isTrendLoading: boolean;
  groupBy: "day" | "week" | "month";
  fromDate: string;
  toDate: string;
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}

export function RevenueTrendChart({
  trendItems,
  isTrendLoading,
  groupBy,
  fromDate,
  toDate,
  hoveredIndex,
  onHover,
}: RevenueTrendChartProps) {
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
      ? Math.max(...trendItems.map((i) => i.revenue), 1000000)
      : 1000000;
  const maxPaidOrders =
    trendItems.length > 0
      ? Math.max(...trendItems.map((i) => i.paid_orders), 10)
      : 10;
  const maxTicketsSold =
    trendItems.length > 0
      ? Math.max(...trendItems.map((i) => i.tickets_sold), 10)
      : 10;

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

  const getX = (index: number) =>
    paddingLeft +
    (trendItems.length > 1
      ? (index / (trendItems.length - 1)) * chartWidth
      : chartWidth / 2);
  const getY = (value: number, maxValue: number) =>
    paddingTop + chartHeight - (value / maxValue) * chartHeight;

  const getLinePath = (
    valueExtractor: (item: RevenueTrendItem) => number,
    maxValue: number,
  ) => {
    if (trendItems.length === 0) return "";
    return trendItems
      .map(
        (item, index) =>
          `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(valueExtractor(item), maxValue)}`,
      )
      .join(" ");
  };

  const revenuePath = getLinePath((i) => i.revenue, maxRevenue);
  const ordersPath = getLinePath((i) => i.paid_orders, maxPaidOrders);
  const ticketsPath = getLinePath((i) => i.tickets_sold, maxTicketsSold);
  const revenueAreaPath = revenuePath
    ? `${revenuePath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`
    : "";

  const formatPeriodLabel = (period: string) => {
    if (!period) return "";
    const parts = period.split("-");
    if (groupBy === "month" && parts.length >= 2)
      return `Tháng ${parts[1]}/${parts[0]}`;
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
    if (parts.length === 3)
      return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2]),
      ).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    if (parts.length === 2) return `Tháng ${parts[1]}, ${parts[0]}`;
    return period;
  };

  const formatDateRangeLabel = () => {
    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

    if (fromDate && toDate)
      return `${formatDate(fromDate)} - ${formatDate(toDate)}`;
    if (fromDate) return `Tá»« ${formatDate(fromDate)}`;
    if (toDate) return `Äáº¿n ${formatDate(toDate)}`;
    return "Táº¥t cáº£ thá»i gian";
  };

  return (
    <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col min-h-[480px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Revenue trend
          </h3>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatDateRangeLabel()}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-blue-400">
            <span className="w-2.5 h-1.5 rounded bg-blue-500 inline-block" />
            Revenue (VND)
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-1.5 rounded bg-emerald-500 inline-block" />
            Paid orders
          </div>
          <div className="flex items-center gap-1.5 text-violet-400">
            <span className="w-2.5 h-1.5 rounded bg-violet-500 inline-block" />
            Tickets sold
          </div>
        </div>
      </div>

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

              {yTicksLeft.map((val, idx) => {
                const y =
                  paddingTop + (idx / (yTicksLeft.length - 1)) * chartHeight;
                return (
                  <g key={idx}>
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

              {revenueAreaPath && (
                <path d={revenueAreaPath} fill="url(#revenue-gradient)" />
              )}
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

              {hoveredIndex !== null && trendItems[hoveredIndex] && (
                <line
                  x1={getX(hoveredIndex)}
                  y1={paddingTop}
                  x2={getX(hoveredIndex)}
                  y2={paddingTop + chartHeight}
                  stroke="var(--color-outline)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
              )}

              {trendItems.map((item, index) => {
                const x = getX(index);
                const isHovered = hoveredIndex === index;
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={getY(item.revenue, maxRevenue)}
                      r={isHovered ? 6 : 3}
                      fill={isHovered ? "#3b82f6" : "var(--color-surface)"}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      className="transition-all duration-75"
                    />
                    <circle
                      cx={x}
                      cy={getY(item.paid_orders, maxPaidOrders)}
                      r={isHovered ? 5 : 2.5}
                      fill={isHovered ? "#10b981" : "var(--color-surface)"}
                      stroke="#10b981"
                      strokeWidth={1.5}
                      className="transition-all duration-75"
                    />
                    <circle
                      cx={x}
                      cy={getY(item.tickets_sold, maxTicketsSold)}
                      r={isHovered ? 5 : 2.5}
                      fill={isHovered ? "#8b5cf6" : "var(--color-surface)"}
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      className="transition-all duration-75"
                    />
                  </g>
                );
              })}

              {trendItems.map((item, idx) => {
                const x = getX(idx);
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

              {trendItems.map((_, idx) => {
                const barWidth =
                  chartWidth / Math.max(trendItems.length - 1, 1);
                const x = getX(idx);
                return (
                  <rect
                    key={idx}
                    x={x - barWidth / 2}
                    y={paddingTop}
                    width={barWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => onHover(idx)}
                    onMouseLeave={() => onHover(null)}
                  />
                );
              })}
            </svg>

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
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Revenue:
                    </span>
                    <span className="font-mono">
                      {formatVND(trendItems[hoveredIndex].revenue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 font-semibold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
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
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
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
  );
}
