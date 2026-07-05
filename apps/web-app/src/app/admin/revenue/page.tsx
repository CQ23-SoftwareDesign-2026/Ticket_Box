"use client";

import { useAdminRevenue } from "./_hooks/useAdminRevenue";
import { RevenueFilterBar } from "./_components/RevenueFilterBar";
import { RevenueTrendChart } from "./_components/RevenueTrendChart";
import { ConcertRevenueTable } from "./_components/ConcertRevenueTable";
import { ConcertDetailDrawer } from "./_components/ConcertDetailDrawer";

export default function AdminRevenuePage() {
  const {
    fromDate,
    toDate,
    groupBy,
    tempFromDate,
    setTempFromDate,
    tempToDate,
    setTempToDate,
    tempGroupBy,
    setTempGroupBy,
    tempStatus,
    setTempStatus,
    fromDateRef,
    toDateRef,
    trendItems,
    isTrendLoading,
    isConcertsLoading,
    filteredConcerts,
    paginatedConcerts,
    tableSearch,
    setTableSearch,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    selectedConcertId,
    setSelectedConcertId,
    detailData,
    setDetailData,
    isDetailLoading,
    hoveredIndex,
    setHoveredIndex,
    tierTotals,
    handleApply,
    handleReset,
  } = useAdminRevenue();

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

      <RevenueFilterBar
        tempFromDate={tempFromDate}
        tempToDate={tempToDate}
        tempGroupBy={tempGroupBy}
        tempStatus={tempStatus}
        fromDateRef={fromDateRef}
        toDateRef={toDateRef}
        onFromDateChange={setTempFromDate}
        onToDateChange={setTempToDate}
        onGroupByChange={setTempGroupBy}
        onStatusChange={setTempStatus}
        onApply={handleApply}
        onReset={handleReset}
      />

      <RevenueTrendChart
        trendItems={trendItems}
        isTrendLoading={isTrendLoading}
        groupBy={groupBy}
        hoveredIndex={hoveredIndex}
        onHover={setHoveredIndex}
      />

      <ConcertRevenueTable
        paginatedConcerts={paginatedConcerts}
        filteredConcerts={filteredConcerts}
        isConcertsLoading={isConcertsLoading}
        tableSearch={tableSearch}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onSearchChange={setTableSearch}
        onPageChange={setCurrentPage}
        onViewDetail={setSelectedConcertId}
      />

      <ConcertDetailDrawer
        selectedConcertId={selectedConcertId}
        detailData={detailData}
        isDetailLoading={isDetailLoading}
        fromDate={fromDate}
        toDate={toDate}
        tierTotals={tierTotals}
        onClose={() => {
          setSelectedConcertId(null);
          setDetailData(null);
        }}
      />
    </div>
  );
}
