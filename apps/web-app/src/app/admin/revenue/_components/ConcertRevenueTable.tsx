"use client";

import { Building2, MapPin, Search } from "lucide-react";
import { getConcertPosterUrl } from "@/services/concert.service";
import { type RevenueByConcertItem } from "@/services/revenue.service";
import { StatusBadge } from "../../_components/StatusBadge";
import { Pagination } from "../../_components/Pagination";

const formatVND = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    value,
  );

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
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
  );
};

interface ConcertRevenueTableProps {
  paginatedConcerts: RevenueByConcertItem[];
  filteredConcerts: RevenueByConcertItem[];
  isConcertsLoading: boolean;
  tableSearch: string;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onViewDetail: (id: string) => void;
}

export function ConcertRevenueTable({
  paginatedConcerts,
  filteredConcerts,
  isConcertsLoading,
  tableSearch,
  currentPage,
  totalPages,
  itemsPerPage,
  onSearchChange,
  onPageChange,
  onViewDetail,
}: ConcertRevenueTableProps) {
  return (
    <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Doanh thu theo sự kiện
          </h3>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm sự kiện..."
            value={tableSearch}
            onChange={(e) => {
              onSearchChange(e.target.value);
              onPageChange(1);
            }}
            className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-xs w-full transition-all"
          />
        </div>
      </div>

      <div className="overflow-x-auto w-full">
        {isConcertsLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <span className="font-body text-xs">Đang tải dữ liệu...</span>
            </div>
          </div>
        ) : filteredConcerts.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground font-body text-sm border border-border/50 rounded-xl bg-background/20">
            Không tìm thấy sự kiện nào.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50 font-body text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <th className="p-4 rounded-tl-xl">Sự kiện</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4 text-right">Doanh thu (VND)</th>
                <th className="p-4 text-center">Đơn đã thanh toán</th>
                <th className="p-4 text-center">Vé đã bán</th>
                <th className="p-4 text-center rounded-tr-xl">Thao tác</th>
              </tr>
            </thead>
            <tbody className="font-body text-xs divide-y divide-border/50">
              {paginatedConcerts.map((item) => (
                <tr
                  key={item.concert_id}
                  className="hover:bg-surface-high/20 transition-colors"
                >
                  <td className="p-4 font-semibold text-foreground">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-surface-low border border-border relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getConcertPosterUrl(item.poster_url)}
                          alt={item.concert_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground leading-tight">
                          {item.concert_name}
                        </div>
                        {item.location && (
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span className="line-clamp-1">
                              {item.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <StatusBadge status={item.status} variant="concert" />
                  </td>
                  <td className="p-4 text-muted-foreground font-semibold">
                    {formatConcertDate(item.start_time)}
                  </td>
                  <td className="p-4 text-right font-bold text-foreground font-mono text-sm">
                    {formatVND(item.revenue)}
                  </td>
                  <td className="p-4 text-center font-bold text-foreground font-mono">
                    {item.paid_orders.toLocaleString("vi-VN")}
                  </td>
                  <td className="p-4 text-center font-bold text-foreground font-mono">
                    {item.tickets_sold.toLocaleString("vi-VN")}
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => onViewDetail(item.concert_id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary hover:bg-primary hover:text-white font-body text-xs font-bold rounded-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200 cursor-pointer"
                    >
                      Xem chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isConcertsLoading && totalPages > 1 && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={filteredConcerts.length}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
          itemLabel="sự kiện"
        />
      )}
    </section>
  );
}
