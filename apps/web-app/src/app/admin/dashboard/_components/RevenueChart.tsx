"use client";

import { Calendar } from "lucide-react";
import { type RevenueItem } from "@/services/dashboard.service";

interface RevenueChartProps {
  revenueData: RevenueItem[];
  isLoadingRevenue: boolean;
  groupBy: "day" | "week" | "month";
  tempFromDate: string;
  tempToDate: string;
  tempGroupBy: "day" | "week" | "month";
  fromDateRef: React.RefObject<HTMLInputElement | null>;
  toDateRef: React.RefObject<HTMLInputElement | null>;
  hoveredIndex: number | null;
  svgWidth: number;
  svgHeight: number;
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  chartWidth: number;
  chartHeight: number;
  yLabels: number[];
  points: { x: number; y: number; item: RevenueItem; index: number }[];
  linePath: string;
  fillPath: string;
  totalRevenue: number;
  averageRevenue: number;
  highestItem: RevenueItem | null;
  lowestItem: RevenueItem | null;
  onHover: (idx: number | null) => void;
  onTempFromDateChange: (v: string) => void;
  onTempToDateChange: (v: string) => void;
  onTempGroupByChange: (v: "day" | "week" | "month") => void;
  onApply: () => void;
  onReset: () => void;
  onExportCsv: () => void;
  formatYAxisLabel: (v: number) => string;
  formatXAxisLabel: (period: string, type: "day" | "week" | "month") => string;
  formatDateSubtext: (period: string) => string;
  formatValueVND: (v: number) => string;
}

export function RevenueChart({
  revenueData,
  isLoadingRevenue,
  groupBy,
  tempFromDate,
  tempToDate,
  tempGroupBy,
  fromDateRef,
  toDateRef,
  hoveredIndex,
  svgWidth,
  svgHeight,
  paddingLeft,
  paddingRight,
  paddingTop,
  chartWidth,
  chartHeight,
  yLabels,
  points,
  linePath,
  fillPath,
  totalRevenue,
  averageRevenue,
  highestItem,
  lowestItem,
  onHover,
  onTempFromDateChange,
  onTempToDateChange,
  onTempGroupByChange,
  onApply,
  onReset,
  onExportCsv,
  formatYAxisLabel,
  formatXAxisLabel,
  formatDateSubtext,
  formatValueVND,
}: RevenueChartProps) {
  return (
    <section className="lg:col-span-2 bg-surface rounded-xl shadow-sm border border-border p-6 flex flex-col min-h-[460px]">
      <div className="flex flex-row justify-between items-center mb-6">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Doanh thu theo thời gian
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-body">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
            <span>Doanh thu (VND)</span>
          </div>
          <button
            onClick={onExportCsv}
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
            Xuất file
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end mb-6 pb-6 border-b border-border/50">
        <div className="md:col-span-5 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Khoảng thời gian
          </span>
          <div
            onClick={() => fromDateRef.current?.showPicker()}
            className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-foreground hover:border-primary/50 transition-all cursor-pointer w-full group"
          >
            <Calendar className="w-4 h-4 text-on-surface-variant/85 group-hover:text-primary transition-colors shrink-0" />
            <div className="flex items-center justify-between grow">
              <input
                ref={fromDateRef}
                type="date"
                value={tempFromDate}
                onClick={(e) => {
                  e.stopPropagation();
                  fromDateRef.current?.showPicker();
                }}
                onChange={(e) => onTempFromDateChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="bg-transparent text-foreground focus:outline-none w-[90px] min-w-0 font-body text-xs cursor-pointer text-center font-semibold"
              />
              <span className="text-muted-foreground font-bold text-xs select-none px-1">
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
                onChange={(e) => onTempToDateChange(e.target.value)}
                style={{ colorScheme: "dark" }}
                className="bg-transparent text-foreground focus:outline-none w-[90px] min-w-0 font-body text-xs cursor-pointer text-center font-semibold"
              />
            </div>
          </div>
        </div>
        <div className="md:col-span-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Gom nhóm
          </span>
          <div className="relative">
            <select
              value={tempGroupBy}
              onChange={(e) =>
                onTempGroupByChange(e.target.value as "day" | "week" | "month")
              }
              className="appearance-none bg-background border border-border rounded-xl pl-4 pr-10 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full transition-all cursor-pointer"
            >
              <option value="day" className="bg-surface text-foreground font-semibold">Ngày</option>
              <option value="week" className="bg-surface text-foreground font-semibold">Tuần</option>
              <option value="month" className="bg-surface text-foreground font-semibold">Tháng</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="md:col-span-4 flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex-1 bg-surface-high hover:bg-surface-high/80 text-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl border border-border transition-all active:scale-95 duration-150 cursor-pointer"
          >
            Đặt lại
          </button>
          <button
            onClick={onApply}
            className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground font-body text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5 active:scale-95 duration-150 cursor-pointer"
          >
            Áp dụng
          </button>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="grow relative min-h-[250px] w-full">
        {isLoadingRevenue ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : revenueData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground font-body text-sm">
            Không ghi nhận doanh thu trong khoảng thời gian này.
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
                <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

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
                      strokeDasharray={idx === yLabels.length - 1 ? "" : "4 4"}
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

              {fillPath && <path d={fillPath} fill="url(#chart-gradient)" />}
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

              {points.map((pt, idx) => (
                <circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={hoveredIndex === idx ? 6 : 3}
                  fill={
                    hoveredIndex === idx ? "#3b82f6" : "var(--color-surface)"
                  }
                  stroke="#3b82f6"
                  strokeWidth={2}
                  className="transition-all duration-75"
                />
              ))}

              {points.map((pt, idx) => {
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

              {points.map((pt, idx) => {
                const rectWidth = chartWidth / Math.max(points.length - 1, 1);
                return (
                  <rect
                    key={idx}
                    x={pt.x - rectWidth / 2}
                    y={paddingTop}
                    width={rectWidth}
                    height={chartHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => onHover(idx)}
                    onMouseLeave={() => onHover(null)}
                  />
                );
              })}
            </svg>

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
                  <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  Doanh thu:{" "}
                  {new Intl.NumberFormat("vi-VN").format(
                    points[hoveredIndex].item.revenue,
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Stats */}
      {!isLoadingRevenue && revenueData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border mt-6 pt-6 gap-4 sm:gap-0">
          <div className="flex flex-col items-center sm:items-start sm:px-4 pb-4 sm:pb-0 justify-center">
            <span className="text-xs text-muted-foreground mb-1">
              Tổng doanh thu
            </span>
            <span className="text-lg font-black text-foreground">
              {formatValueVND(totalRevenue)}
            </span>
          </div>
          <div className="flex flex-col items-center sm:items-start sm:px-4 py-4 sm:py-0 justify-center">
            <span className="text-xs text-muted-foreground mb-1">
              Trung bình mỗi {groupBy === "day" ? "ngày" : groupBy === "week" ? "tuần" : "tháng"}
            </span>
            <span className="text-lg font-black text-foreground">
              {formatValueVND(averageRevenue)}
            </span>
          </div>
          <div className="flex flex-col items-center sm:items-start sm:px-4 py-4 sm:py-0 justify-center">
            <span className="text-xs text-muted-foreground mb-1">
              {groupBy === "day" ? "Ngày" : groupBy === "week" ? "Tuần" : "Tháng"} doanh thu cao nhất
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
          <div className="flex flex-col items-center sm:items-start sm:px-4 pt-4 sm:pt-0 justify-center">
            <span className="text-xs text-muted-foreground mb-1">
              {groupBy === "day" ? "Ngày" : groupBy === "week" ? "Tuần" : "Tháng"} doanh thu thấp nhất
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
  );
}
