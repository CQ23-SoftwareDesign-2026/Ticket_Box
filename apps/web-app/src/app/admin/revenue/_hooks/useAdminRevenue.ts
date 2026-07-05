"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  getRevenueTrend,
  getRevenueByConcert,
  getConcertRevenueDetail,
  type RevenueTrendItem,
  type RevenueByConcertItem,
  type ConcertRevenueDetailResponse,
} from "@/services/revenue.service";

export function useAdminRevenue() {
  // Applied filter state
  const [fromDate, setFromDate] = useState<string>("2026-03-01");
  const [toDate, setToDate] = useState<string>("2026-07-04");
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Temp (pending) filter state
  const [tempFromDate, setTempFromDate] = useState<string>("2026-03-01");
  const [tempToDate, setTempToDate] = useState<string>("2026-07-04");
  const [tempGroupBy, setTempGroupBy] = useState<"day" | "week" | "month">(
    "day",
  );
  const [tempStatus, setTempStatus] = useState<string>("All");

  const fromDateRef = useRef<HTMLInputElement>(null);
  const toDateRef = useRef<HTMLInputElement>(null);

  // Data states
  const [trendItems, setTrendItems] = useState<RevenueTrendItem[]>([]);
  const [concertItems, setConcertItems] = useState<RevenueByConcertItem[]>([]);
  const [isTrendLoading, setIsTrendLoading] = useState<boolean>(true);
  const [isConcertsLoading, setIsConcertsLoading] = useState<boolean>(true);

  // Table search and pagination
  const [tableSearch, setTableSearch] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 7;

  // Drawer
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null,
  );
  const [detailData, setDetailData] =
    useState<ConcertRevenueDetailResponse | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);

  // Chart hover
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Fetch trend
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

  // Fetch concerts
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

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchTrendData("2026-03-01", "2026-07-04", "day");
      void fetchConcertsData("2026-03-01", "2026-07-04", "All");
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTrendData, fetchConcertsData]);

  // Fetch detail on concert selection
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

  const handleApply = () => {
    setFromDate(tempFromDate);
    setToDate(tempToDate);
    setGroupBy(tempGroupBy);
    void fetchTrendData(tempFromDate, tempToDate, tempGroupBy);
    void fetchConcertsData(tempFromDate, tempToDate, tempStatus);
  };

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

  // Derived data
  const filteredConcerts = concertItems.filter((item) =>
    item.concert_name.toLowerCase().includes(tableSearch.toLowerCase().trim()),
  );
  const totalPages = Math.ceil(filteredConcerts.length / itemsPerPage) || 1;
  const paginatedConcerts = filteredConcerts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const tierTotals = detailData?.ticket_tiers?.reduce(
    (acc, curr) => {
      acc.total_quantity += curr.total_quantity;
      acc.tickets_sold += curr.tickets_sold;
      acc.remaining_quantity += curr.remaining_quantity;
      acc.revenue += curr.revenue;
      return acc;
    },
    { total_quantity: 0, tickets_sold: 0, remaining_quantity: 0, revenue: 0 },
  ) ?? {
    total_quantity: 0,
    tickets_sold: 0,
    remaining_quantity: 0,
    revenue: 0,
  };

  return {
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
    concertItems,
    isTrendLoading,
    isConcertsLoading,
    tableSearch,
    setTableSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    totalPages,
    filteredConcerts,
    paginatedConcerts,
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
  };
}
