import apiClient from "./api";

export type AdminNotification = {
  id: string;
  type: "TICKET_PURCHASED" | "CONCERT_REMINDER";
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string };
  concert: { id: string; name: string; start_time: string } | null;
  order: { id: string; status: string } | null;
};

export type AdminNotificationQuery = {
  page?: number;
  limit?: number;
  type?: string;
  read?: boolean;
  search?: string;
};

export type AdminNotificationResponse = {
  data: AdminNotification[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export function getAdminNotifications(query: AdminNotificationQuery) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.type) params.set("type", query.type);
  if (query.read !== undefined) params.set("read", String(query.read));
  if (query.search) params.set("search", query.search);
  return apiClient.get<AdminNotificationResponse>(
    `/admin/notifications?${params.toString()}`,
  );
}
