import apiClient from "./api";

export interface DashboardSummary {
  total_revenue: number;
  tickets_sold: number;
  total_users: number;
  published_events: number;
}

export interface RevenueItem {
  period: string;
  revenue: number;
  paid_orders: number;
  tickets_sold: number;
}

export interface RecentOrder {
  order_id: string;
  customer_name: string;
  customer_email: string;
  concert_name: string;
  status: string;
  total_amount: number;
  ticket_count: number;
  created_at: string;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiClient.get<DashboardSummary>("/admin/dashboard/summary");
}

export async function getDashboardRevenue(params?: {
  from?: string;
  to?: string;
  group_by?: "day" | "week" | "month";
  status?: string;
}): Promise<RevenueItem[]> {
  const query = new URLSearchParams();
  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);
  if (params?.group_by) query.append("group_by", params.group_by);
  if (params?.status && params.status !== "All")
    query.append("status", params.status);

  const queryString = query.toString();
  const endpoint = `/admin/dashboard/revenue${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<RevenueItem[]>(endpoint);
}

export async function getDashboardRecentOrders(params?: {
  limit?: number;
}): Promise<RecentOrder[]> {
  const query = new URLSearchParams();
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const endpoint = `/admin/dashboard/recent-orders${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<RecentOrder[]>(endpoint);
}
