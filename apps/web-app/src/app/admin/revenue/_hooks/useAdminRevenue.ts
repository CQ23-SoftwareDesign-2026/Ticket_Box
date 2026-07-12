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
  const initialFromDate = "2026-03-01";
  const getTodayDate = () => new Date().toISOString().slice(0, 10);

  const normalizeDateRangeForQuery = (from?: string, to?: string) => ({
    from: from || undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  });

  // Applied filter state
  const [fromDate, setFromDate] = useState<string>(initialFromDate);
  const [toDate, setToDate] = useState<string>(getTodayDate);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  // Temp (pending) filter state
  const [tempFromDate, setTempFromDate] = useState<string>(initialFromDate);
  const [tempToDate, setTempToDate] = useState<string>(getTodayDate);
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
        const range = normalizeDateRangeForQuery(fromVal, toVal);
        const res = await getRevenueTrend({
          from: range.from,
          to: range.to,
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
        const range = normalizeDateRangeForQuery(fromVal, toVal);
        const res = await getRevenueByConcert({
          from: range.from,
          to: range.to,
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
      const today = getTodayDate();
      void fetchTrendData(initialFromDate, today, "day");
      void fetchConcertsData(initialFromDate, today, "All");
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchTrendData, fetchConcertsData]);

  // Fetch detail on concert selection
  useEffect(() => {
    if (!selectedConcertId) return;
    const fetchDetail = async () => {
      try {
        setIsDetailLoading(true);
        const range = normalizeDateRangeForQuery(fromDate, toDate);
        const res = await getConcertRevenueDetail(selectedConcertId, {
          from: range.from,
          to: range.to,
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
