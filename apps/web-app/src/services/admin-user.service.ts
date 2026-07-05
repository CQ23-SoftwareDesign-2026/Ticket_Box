import apiClient from "./api";

export interface AdminUserListItem {
  id: string;
  email: string;
  full_name: string;
  status: string;
  roles: string[];
  created_at: string;
  order_count: number;
  ticket_count: number;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface AdminUserListResponse {
  items: AdminUserListItem[];
  meta: PaginationMeta;
}

export interface AdminUserRecentOrder {
  order_id: string;
  concert_name: string;
  status: string;
  total_amount: number;
  ticket_count: number;
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  full_name: string;
  status: string;
  roles: string[];
  created_at: string;
  stats: {
    order_count: number;
    paid_order_count: number;
    ticket_count: number;
    total_spent: number;
  };
  recent_orders: AdminUserRecentOrder[];
}

export interface CreateAdminUserPayload {
  email: string;
  password?: string;
  full_name: string;
  roles: string[];
  status?: string;
}

export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
  status?: string;
  role?: string;
  search?: string;
}): Promise<AdminUserListResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.append("page", params.page.toString());
  if (params?.limit) query.append("limit", params.limit.toString());
  if (params?.status && params.status !== "All")
    query.append("status", params.status);
  if (params?.role && params.role !== "All") query.append("role", params.role);
  if (params?.search && params.search.trim())
    query.append("search", params.search.trim());

  const queryString = query.toString();
  const endpoint = `/admin/users${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<AdminUserListResponse>(endpoint);
}

export interface CreateAdminUserResponse {
  id: string;
  email: string;
  full_name: string;
  status: string;
  roles: string[];
  created_at: string;
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<CreateAdminUserResponse> {
  return apiClient.post<CreateAdminUserResponse>("/admin/users", payload);
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function updateAdminUserStatus(
  userId: string,
  status: string,
): Promise<AdminUserListItem> {
  return apiClient.patch<AdminUserListItem>(`/admin/users/${userId}/status`, {
    status,
  });
}

export async function updateAdminUserRoles(
  userId: string,
  roles: string[],
): Promise<AdminUserDetail> {
  return apiClient.patch<AdminUserDetail>(`/admin/users/${userId}/roles`, {
    roles,
  });
}
