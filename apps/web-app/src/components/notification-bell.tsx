"use client";

import Link from "next/link";
import { Bell, CheckCheck, Ticket, Clock } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  NotificationItem,
  notificationService,
  streamNotifications,
} from "@/services/notification.service";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    const [list, count] = await Promise.all([
      notificationService.list(),
      notificationService.unreadCount(),
    ]);
    setItems(list.data);
    setUnread(count.count);
  }, []);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      try {
        await streamNotifications(controller.signal, (notification) => {
          setItems((current) =>
            [
              notification,
              ...current.filter((item) => item.id !== notification.id),
            ].slice(0, 20),
          );
          setUnread((count) => count + 1);
        });
      } catch {
        if (!controller.signal.aborted) retry = setTimeout(connect, 3000);
      }
    };
    void connect();
    return () => {
      controller.abort();
      if (retry) clearTimeout(retry);
    };
  }, [refresh]);

  const read = async (item: NotificationItem) => {
    if (!item.read_at) {
      await notificationService.markRead(item.id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, read_at: new Date().toISOString() }
            : entry,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-label="Thông báo"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/60 text-slate-300 transition hover:border-primary/60 hover:text-white"
      >
        <Bell size={19} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-5 text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-800 bg-[#121c28] shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h3 className="font-bold text-white">Thông báo</h3>
              <p className="text-xs text-slate-400">{unread} chưa đọc</p>
            </div>
            {unread > 0 && (
              <button
                onClick={() =>
                  void notificationService.markAllRead().then(() => {
                    setUnread(0);
                    setItems((current) =>
                      current.map((item) => ({
                        ...item,
                        read_at: item.read_at ?? new Date().toISOString(),
                      })),
                    );
                  })
                }
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80"
              >
                <CheckCheck size={15} /> Đọc tất cả
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                Chưa có thông báo nào.
              </div>
            ) : (
              items.map((item) => {
                const Icon = item.type === "TICKET_PURCHASED" ? Ticket : Clock;
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition hover:bg-slate-800/70 ${item.read_at ? "" : "bg-primary/5"}`}
                  >
                    <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-slate-400">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    {!item.read_at && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                );
                return item.data?.route ? (
                  <Link
                    key={item.id}
                    href={item.data.route}
                    onClick={() => void read(item)}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => void read(item)}
                    className="block w-full text-left"
                  >
                    {content}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
