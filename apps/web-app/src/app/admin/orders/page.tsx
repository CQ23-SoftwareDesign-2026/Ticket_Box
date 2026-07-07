"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { formatConcertCurrency } from "@/services/concert.service";
import { getAdminOrders, type AdminOrderListItem } from "@/services/order.service";

const ORDER_STATUS_CLASSES: Record<string, string> = {
  PAID: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  CANCELLED: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-surface-highest text-muted-foreground hover:text-foreground transition-all active:scale-90 cursor-pointer shrink-0"
      title="Sao chép"
    >
      {copied ? (
        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 select-none">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Đã chép
        </span>
      ) : (
        <svg className="w-3.5 h-3.5 shrink-0 select-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
        </svg>
      )}
    </button>
  );
}

export default function AdminOrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Debounce search input to prevent API spamming
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    async function fetchOrders() {
      try {
        setIsLoading(true);
        const response = await getAdminOrders({
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
        });
        setOrders(response.data);
        setTotalPages(response.meta.totalPages);
      } catch (err) {
        console.error("Failed to fetch admin orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    void fetchOrders();
  }, [page, limit, debouncedSearch, statusFilter]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mb-2 select-none"
          >
            <ChevronLeft size={14} /> Quay lại trang tổng quan
          </Link>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Quản lý Đơn hàng
          </h1>
          <p className="text-muted-foreground font-body text-sm">
            Duyệt, tìm kiếm và giám sát tất cả các giao dịch vé trên hệ thống
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 bg-surface border border-border rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            className="pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body text-sm w-full transition-all text-foreground"
            placeholder="Tìm theo mã đơn, tên, email..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
          <span className="text-xs text-muted-foreground font-body font-semibold select-none">
            Trạng thái:
          </span>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="appearance-none pl-3 pr-8 py-1.5 border border-border rounded-lg bg-background font-body text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground font-semibold cursor-pointer"
            >
              <option value="" className="bg-surface text-foreground font-semibold">Tất cả Trạng thái</option>
              <option value="PAID" className="bg-surface text-foreground font-semibold">ĐÃ THANH TOÁN</option>
              <option value="PENDING" className="bg-surface text-foreground font-semibold">CHỜ THANH TOÁN</option>
              <option value="CANCELLED" className="bg-surface text-foreground font-semibold">ĐÃ HỦY</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-32 text-center text-muted-foreground">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="font-body text-sm select-none">
                Đang tải danh sách đơn hàng...
              </span>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-32 text-center text-muted-foreground font-body text-sm select-none">
            Không tìm thấy đơn hàng nào khớp với bộ lọc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-background/50 font-body text-xs font-semibold text-muted-foreground uppercase tracking-wider select-none">
                  <th className="p-4 border-b border-border">Mã đơn hàng</th>
                  <th className="p-4 border-b border-border">Khách hàng</th>
                  <th className="p-4 border-b border-border">Sự kiện</th>
                  <th className="p-4 border-b border-border text-center">Số vé</th>
                  <th className="p-4 border-b border-border">Số tiền</th>
                  <th className="p-4 border-b border-border">Trạng thái</th>
                  <th className="p-4 border-b border-border">Ngày tạo</th>
                  <th className="p-4 border-b border-border text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="font-body text-sm divide-y divide-border/60">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                    className="hover:bg-surface-high/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-foreground break-all">
                          {order.id.toUpperCase()}
                        </span>
                        <CopyButton text={order.id} />
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-foreground">
                        {order.user_name || "Khách hàng ẩn danh"}
                      </p>
                      {order.user_email && (
                        <p className="text-muted-foreground text-xs">{order.user_email}</p>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-foreground max-w-xs truncate" title={order.concert_name}>
                      {order.concert_name}
                    </td>
                    <td className="p-4 text-center font-bold text-foreground">
                      {order.ticket_count}
                    </td>
                    <td className="p-4 font-bold text-primary">
                      {formatConcertCurrency(Number(order.total_amount))}
                    </td>
                    <td className="p-4 select-none">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full font-body text-[10px] font-bold border ${ORDER_STATUS_CLASSES[order.status] ?? "bg-surface-highest text-foreground border-border"}`}
                      >
                        {order.status === "PAID"
                          ? "ĐÃ THANH TOÁN"
                          : order.status === "PENDING"
                            ? "CHỜ THANH TOÁN"
                            : "ĐÃ HỦY"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="p-4 text-center select-none">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!isLoading && totalPages > 1 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 bg-background/30 select-none">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-xs text-muted-foreground font-body">
                Trang <span className="font-bold text-foreground">{page}</span> trên{" "}
                <span className="font-bold text-foreground">{totalPages}</span>
              </span>

              {/* Limit Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Hiển thị:
                </span>
                <div className="relative">
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="appearance-none pl-2.5 pr-7 py-1 border border-border rounded-lg bg-background font-body text-xs focus:outline-none focus:border-primary text-foreground font-semibold cursor-pointer"
                  >
                    <option value={10}>10 dòng</option>
                    <option value={20}>20 dòng</option>
                    <option value={50}>50 dòng</option>
                    <option value={100}>100 dòng</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-muted-foreground">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 border border-border rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1.5">
                {getPageNumbers().map((p, idx) => {
                  if (p === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-2 text-muted-foreground text-xs font-semibold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={`page-${p}`}
                      onClick={() => setPage(p as number)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        isCurrent
                          ? "bg-primary border-primary text-white"
                          : "border-border hover:border-primary/50 text-foreground hover:text-primary"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 border border-border rounded-lg hover:border-primary/50 hover:text-primary transition-all disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted-foreground cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
