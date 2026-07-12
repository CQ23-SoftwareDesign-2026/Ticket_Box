"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Clock3,
  Mail,
  Search,
  Ticket,
  TriangleAlert,
} from "lucide-react";
import {
  AdminNotification,
  getAdminNotifications,
} from "@/services/admin-notification.service";
import { Pagination } from "@/app/admin/_components/Pagination";

const typeMeta = {
  TICKET_PURCHASED: {
    label: "Xác nhận mua vé",
    icon: Ticket,
    classes: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
  },
  CONCERT_REMINDER: {
    label: "Nhắc lịch concert",
    icon: Clock3,
    classes: "border-violet-500/20 bg-violet-500/10 text-violet-300",
  },
} as const;

function TableSkeleton() {
  return (
    <div className="divide-y divide-border/60" aria-label="Đang tải thông báo">
      {Array.from({ length: 7 }).map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[minmax(260px,1.3fr)_minmax(190px,1fr)_minmax(180px,1fr)_140px] gap-6 px-5 py-4"
        >
          <div className="space-y-2">
            <div className="h-4 w-40 animate-pulse rounded bg-surface-high" />
            <div className="h-3 w-full max-w-80 animate-pulse rounded bg-surface-low" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-surface-high" />
            <div className="h-3 w-44 animate-pulse rounded bg-surface-low" />
          </div>
          <div className="h-4 w-36 animate-pulse rounded bg-surface-low" />
          <div className="h-4 w-24 animate-pulse rounded bg-surface-low" />
        </div>
      ))}
    </div>
  );
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [type, setType] = useState("");
  const [read, setRead] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    let active = true;
    void getAdminNotifications({
      page,
      limit,
      search: debouncedSearch || undefined,
      type: type || undefined,
      read: read === "" ? undefined : read === "read",
    })
      .then((response) => {
        if (!active) return;
        setItems(response.data);
        setTotal(response.meta.total);
        setTotalPages(response.meta.totalPages);
        setError(false);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, limit, debouncedSearch, type, read, reloadKey]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Thông báo hệ thống
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Theo dõi thông báo xác nhận vé và nhắc lịch đã tạo cho khán giả.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Bell size={16} className="text-primary" />
          <span>
            <strong className="text-foreground">
              {total.toLocaleString("vi-VN")}
            </strong>{" "}
            thông báo
          </span>
        </div>
      </header>

      <section
        aria-label="Bộ lọc thông báo"
        className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 lg:flex-row lg:items-center"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, tên hoặc email..."
            className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-slate-400"
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Loại thông báo"
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả loại</option>
            <option value="TICKET_PURCHASED">Xác nhận mua vé</option>
            <option value="CONCERT_REMINDER">Nhắc lịch concert</option>
          </select>
          <select
            aria-label="Trạng thái đọc"
            value={read}
            onChange={(event) => {
              setRead(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="unread">Chưa đọc</option>
            <option value="read">Đã đọc</option>
          </select>
        </div>
      </section>

      <section
        className="overflow-hidden rounded-xl border border-border bg-surface"
        aria-live="polite"
      >
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-400">
              <TriangleAlert size={22} />
            </span>
            <h2 className="font-semibold text-foreground">
              Không thể tải thông báo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kết nối tới máy chủ thất bại. Vui lòng thử lại.
            </p>
            <button
              onClick={() => setReloadKey((value) => value + 1)}
              className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Thử lại
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail size={22} />
            </span>
            <h2 className="font-semibold text-foreground">
              Không có thông báo phù hợp
            </h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Thử thay đổi từ khóa hoặc bộ lọc. Thông báo mới sẽ xuất hiện sau
              khi thanh toán thành công hoặc trước concert 24 giờ.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] text-left">
                <thead>
                  <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted-foreground">
                    <th className="px-5 py-3.5">Thông báo</th>
                    <th className="px-5 py-3.5">Khán giả</th>
                    <th className="px-5 py-3.5">Liên quan</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => {
                    const meta = typeMeta[item.type];
                    const Icon = meta.icon;
                    return (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-surface-low/40"
                      >
                        <td className="max-w-md px-5 py-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.classes}`}
                            >
                              <Icon size={17} />
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">
                                {item.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {item.message}
                              </p>
                              <span
                                className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.classes}`}
                              >
                                {meta.label}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-foreground">
                            {item.user.full_name}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.user.email}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          {item.order ? (
                            <Link
                              href={`/admin/orders/${item.order.id}`}
                              className="text-sm font-semibold text-primary hover:underline"
                            >
                              Chi tiết đơn hàng
                            </Link>
                          ) : item.concert ? (
                            <p
                              className="max-w-52 truncate text-sm text-foreground"
                              title={item.concert.name}
                            >
                              {item.concert.name}
                            </p>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {item.read_at ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-600/50 bg-slate-700/30 px-2.5 py-1 text-xs font-semibold text-slate-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                              Đã đọc
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                              Chưa đọc
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleString("vi-VN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border lg:hidden">
              {items.map((item) => {
                const meta = typeMeta[item.type];
                const Icon = meta.icon;
                return (
                  <article key={item.id} className="space-y-3 p-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${meta.classes}`}
                      >
                        <Icon size={17} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-sm font-semibold text-foreground">
                            {item.title}
                          </h2>
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.read_at ? "bg-slate-500" : "bg-amber-400"}`}
                          />
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {item.message}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <dt className="text-muted-foreground">Khán giả</dt>
                        <dd className="mt-0.5 truncate font-semibold text-foreground">
                          {item.user.full_name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Thời gian</dt>
                        <dd className="mt-0.5 text-foreground">
                          {new Date(item.created_at).toLocaleString("vi-VN")}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </>
        )}
        {!loading && !error && totalPages > 0 && (
          <footer className="bg-background/30 px-4 pb-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              itemsPerPage={limit}
              itemLabel="thông báo"
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </footer>
        )}
      </section>
    </div>
  );
}
