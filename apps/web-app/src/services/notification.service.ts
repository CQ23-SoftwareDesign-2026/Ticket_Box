import { API_BASE_URL, apiClient } from "./api";
import { tokenStorage } from "@/utils/token.utils";

export type NotificationItem = {
  id: string;
  type: "TICKET_PURCHASED" | "CONCERT_REMINDER";
  title: string;
  message: string;
  data?: { route?: string; orderId?: string; concertId?: string } | null;
  read_at?: string | null;
  created_at: string;
};

type NotificationList = {
  data: NotificationItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const notificationService = {
  list: (unreadOnly = false) =>
    apiClient.get<NotificationList>(
      `/notifications?limit=20&unreadOnly=${unreadOnly}`,
    ),
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) =>
    apiClient.patch<NotificationItem>(`/notifications/${id}/read`, {}),
  markAllRead: () =>
    apiClient.patch<{ updated: number }>("/notifications/read-all", {}),
};

export async function streamNotifications(
  signal: AbortSignal,
  onNotification: (notification: NotificationItem) => void,
): Promise<void> {
  const token = tokenStorage.getAccessToken();
  if (!token) return;
  const response = await fetch(`${API_BASE_URL}/notifications/stream`, {
    headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok || !response.body)
    throw new Error(`SSE connection failed (${response.status})`);

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const event = frame.match(/^event:\s*(.+)$/m)?.[1];
      const data = frame.match(/^data:\s*(.+)$/m)?.[1];
      if (event === "notification" && data)
        onNotification(JSON.parse(data) as NotificationItem);
    }
  }
}
