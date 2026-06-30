import { apiClient } from "./api";

export interface OrderListItem {
  id: string;
  concert_name: string;
  status: string;
  total_amount: string;
  created_at: string;
  expires_at: string;
  ticket_count: number;
  latest_payment_method: string | null;
  latest_payment_status: string | null;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface OrderListResponse {
  data: OrderListItem[];
  meta: PaginationMeta;
}

export interface OrderTicket {
  id: string;
  category_id: string;
  category_name: string | null;
  gate_number: number | null;
  qr_code_hash: string;
  is_scanned: boolean;
  scanned_at: string | null;
}

export interface OrderPaymentTransaction {
  id: string;
  payment_method: string;
  status: string | null;
  transaction_id_3rd_party: string | null;
  amount: string;
  idempotency_key: string;
  raw_response: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface OrderDetail {
  id: string;
  concert_name: string;
  status: string;
  total_amount: string;
  created_at: string;
  expires_at: string;
  ticket_count: number;
  ticket_metadata: Record<string, unknown> | null;
  tickets: OrderTicket[];
  payment_transactions: OrderPaymentTransaction[];
}

export async function getOrders(
  page = 1,
  limit = 10,
  status?: string,
): Promise<OrderListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) {
    params.append("status", status);
  }
  return apiClient.get<OrderListResponse>(`/orders?${params.toString()}`);
}

export async function getOrderById(orderId: string): Promise<OrderDetail> {
  return apiClient.get<OrderDetail>(`/orders/${orderId}`);
}

export async function cancelOrder(orderId: string): Promise<OrderDetail> {
  return apiClient.post<OrderDetail>(`/orders/${orderId}/cancel`);
}
