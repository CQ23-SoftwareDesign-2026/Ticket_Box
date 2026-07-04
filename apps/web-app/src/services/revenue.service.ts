import apiClient from "./api";

export interface RevenueTrendItem {
  period: string;
  revenue: number;
  paid_orders: number;
  tickets_sold: number;
}

export interface RevenueTrendResponse {
  group_by: "day" | "week" | "month";
  from: string;
  to: string;
  items: RevenueTrendItem[];
}

export interface RevenueByConcertItem {
  concert_id: string;
  concert_name: string;
  status: "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED";
  start_time: string;
  revenue: number;
  paid_orders: number;
  tickets_sold: number;
}

export interface RevenueByConcertResponse {
  items: RevenueByConcertItem[];
}

export interface ConcertInfo {
  id: string;
  name: string;
  status: string;
  start_time: string;
}

export interface TicketTierRevenue {
  category_id: string;
  name: string;
  price: number;
  total_quantity: number;
  tickets_sold: number;
  remaining_quantity: number;
  revenue: number;
  gate_number: number | null;
}

export interface ConcertRevenueDetailResponse {
  concert: ConcertInfo;
  total_revenue: number;
  paid_orders: number;
  tickets_sold: number;
  ticket_tiers: TicketTierRevenue[];
}

export async function getRevenueTrend(params?: {
  from?: string;
  to?: string;
  group_by?: "day" | "week" | "month";
}): Promise<RevenueTrendResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);
  if (params?.group_by) query.append("group_by", params.group_by);

  const queryString = query.toString();
  const endpoint = `/admin/revenue/trend${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<RevenueTrendResponse>(endpoint);
}

export async function getRevenueByConcert(params?: {
  from?: string;
  to?: string;
  status?: string;
  limit?: number;
}): Promise<RevenueByConcertResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);
  if (params?.status) query.append("status", params.status);
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const endpoint = `/admin/revenue/by-concert${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<RevenueByConcertResponse>(endpoint);
}

export async function getConcertRevenueDetail(
  concertId: string,
  params?: {
    from?: string;
    to?: string;
  },
): Promise<ConcertRevenueDetailResponse> {
  const query = new URLSearchParams();
  if (params?.from) query.append("from", params.from);
  if (params?.to) query.append("to", params.to);

  const queryString = query.toString();
  const endpoint = `/admin/revenue/concerts/${concertId}/detail${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<ConcertRevenueDetailResponse>(endpoint);
}
