import apiClient from "./api";

export interface NotificationTemplate {
  id: string;
  code: string;
  channel: string;
  subject: string;
  content: string;
}

export interface NotificationLog {
  id: string;
  user_id: string;
  template_id: string;
  target: string;
  status: string;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  sent_at: string | null;
  user?: {
    full_name: string;
    email: string;
  };
  template?: {
    code: string;
    channel: string;
    subject: string;
  };
}

export interface NotificationLogsResponse {
  data: NotificationLog[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface CreateTemplatePayload {
  code: string;
  channel: string;
  subject: string;
  content: string;
}

export interface UpdateTemplatePayload {
  channel?: string;
  subject?: string;
  content?: string;
}

export async function getNotificationLogs(params?: {
  page?: number;
  limit?: number;
  status?: string;
  template_code?: string;
  search?: string;
}): Promise<NotificationLogsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append("page", params.page.toString());
  if (params?.limit) queryParams.append("limit", params.limit.toString());
  if (params?.status && params.status !== "All")
    queryParams.append("status", params.status);
  if (params?.template_code && params.template_code !== "All")
    queryParams.append("template_code", params.template_code);
  if (params?.search) queryParams.append("search", params.search);

  const queryString = queryParams.toString();
  const endpoint = `/admin/notifications/logs${queryString ? `?${queryString}` : ""}`;
  return apiClient.get<NotificationLogsResponse>(endpoint);
}

export async function getNotificationLogDetail(
  id: string,
): Promise<NotificationLog> {
  return apiClient.get<NotificationLog>(`/admin/notifications/logs/${id}`);
}

export async function getNotificationTemplates(): Promise<
  NotificationTemplate[]
> {
  return apiClient.get<NotificationTemplate[]>(
    "/admin/notifications/templates",
  );
}

export async function getNotificationTemplateDetail(
  id: string,
): Promise<NotificationTemplate> {
  return apiClient.get<NotificationTemplate>(
    `/admin/notifications/templates/${id}`,
  );
}

export async function createNotificationTemplate(
  payload: CreateTemplatePayload,
): Promise<NotificationTemplate> {
  return apiClient.post<NotificationTemplate>(
    "/admin/notifications/templates",
    payload,
  );
}

export async function updateNotificationTemplate(
  id: string,
  payload: UpdateTemplatePayload,
): Promise<NotificationTemplate> {
  return apiClient.patch<NotificationTemplate>(
    `/admin/notifications/templates/${id}`,
    payload,
  );
}

export async function deleteNotificationTemplate(id: string): Promise<void> {
  return apiClient.delete<void>(`/admin/notifications/templates/${id}`);
}
