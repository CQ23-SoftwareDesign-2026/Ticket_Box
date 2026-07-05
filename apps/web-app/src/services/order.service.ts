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

const orderRequests = new Map<string, Promise<OrderDetail>>();

export async function getOrderById(
  orderId: string,
  isAdmin = false,
): Promise<OrderDetail> {
  const cacheKey = `${orderId}-${isAdmin}`;
  let promise = orderRequests.get(cacheKey);
  if (!promise) {
    const endpoint = isAdmin
      ? `/orders/admin/${orderId}`
      : `/orders/${orderId}`;
    promise = apiClient.get<OrderDetail>(endpoint);
    orderRequests.set(cacheKey, promise);
    void promise.then(
      () => {
        orderRequests.delete(cacheKey);
      },
      () => {
        orderRequests.delete(cacheKey);
      },
    );
  }
  return promise;
}

export async function cancelOrder(orderId: string): Promise<OrderDetail> {
  return apiClient.post<OrderDetail>(`/orders/${orderId}/cancel`);
}

export interface AdminOrderListItem extends OrderListItem {
  user_id: string;
  user_name: string;
  user_email: string;
}

export interface AdminOrderListResponse {
  data: AdminOrderListItem[];
  meta: PaginationMeta;
}

export async function getAdminOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  payment_method?: string;
  user_id?: string;
  concert_id?: string;
}): Promise<AdminOrderListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", String(params.page));
  if (params?.limit) query.append("limit", String(params.limit));
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  if (params?.payment_method)
    query.append("payment_method", params.payment_method);
  if (params?.user_id) query.append("user_id", params.user_id);
  if (params?.concert_id) query.append("concert_id", params.concert_id);

  return apiClient.get<AdminOrderListResponse>(
    `/orders/admin?${query.toString()}`,
  );
}
