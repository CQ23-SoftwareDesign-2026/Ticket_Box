"use client";

import { useAdminDashboard } from "./_hooks/useAdminDashboard";
import { DashboardSummaryCards } from "./_components/DashboardSummaryCards";
import { RevenueChart } from "./_components/RevenueChart";
import { RecentOrdersList } from "./_components/RecentOrdersList";

export default function AdminDashboardPage() {
  const {
    summary,
    isLoadingSummary,
    isLoadingOrders,
    revenueData,
    isLoadingRevenue,
    searchQuery,
    setSearchQuery,
    filteredOrders,
    groupBy,
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
    chartWidth,
    chartHeight,
    points,
    linePath,
    fillPath,
    totalRevenue,
    averageRevenue,
    highestItem,
    lowestItem,
  } = useAdminDashboard();

  const handleExportCsv = () => {
    const headers = ["Period", "Revenue (VND)", "Paid Orders", "Tickets Sold"];
    const rows = revenueData.map((item) => [
      item.period,
      item.revenue,
      item.paid_orders,
      item.tickets_sold,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `revenue_report_${groupBy}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <DashboardSummaryCards
        summary={summary}
        isLoadingSummary={isLoadingSummary}
        formatSummaryNumber={formatSummaryNumber}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RevenueChart
          revenueData={revenueData}
          isLoadingRevenue={isLoadingRevenue}
          groupBy={groupBy}
          tempFromDate={tempFromDate}
          tempToDate={tempToDate}
          tempGroupBy={tempGroupBy}
          fromDateRef={fromDateRef}
          toDateRef={toDateRef}
          hoveredIndex={hoveredIndex}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          paddingLeft={paddingLeft}
          paddingRight={paddingRight}
          paddingTop={paddingTop}
          chartWidth={chartWidth}
          chartHeight={chartHeight}
          yLabels={yLabels}
          points={points}
          linePath={linePath}
          fillPath={fillPath}
          totalRevenue={totalRevenue}
          averageRevenue={averageRevenue}
          highestItem={highestItem}
          lowestItem={lowestItem}
          onHover={setHoveredIndex}
          onTempFromDateChange={setTempFromDate}
          onTempToDateChange={setTempToDate}
          onTempGroupByChange={setTempGroupBy}
          onApply={handleApply}
          onReset={handleReset}
          onExportCsv={handleExportCsv}
          formatYAxisLabel={formatYAxisLabel}
          formatXAxisLabel={formatXAxisLabel}
          formatDateSubtext={formatDateSubtext}
          formatValueVND={formatValueVND}
        />

        <RecentOrdersList
          filteredOrders={filteredOrders}
          isLoadingOrders={isLoadingOrders}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </div>
  );
}
