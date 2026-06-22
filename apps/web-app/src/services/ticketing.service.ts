import apiClient from "./api";

export interface ReserveTicketItem {
  category_id: string;
  quantity: number;
}

export interface ReserveTicketRequest {
  concert_id: string;
  items: ReserveTicketItem[];
}

export interface ReserveTicketResponse {
  status: string;
  order_id: string;
  expires_at: string;
  items: Array<{
    category_id: string;
    quantity: number;
    remaining: number;
  }>;
}

export interface TicketInventoryState {
  category_id: string;
  available: number;
  max_per_user: number;
  reserved_by_user: number;
  remaining_for_user: number;
  can_reserve_more: boolean;
  note?: string;
}

export async function reserveTickets(body: ReserveTicketRequest) {
  return apiClient.post<ReserveTicketResponse>("/tickets/reserve", body);
}

export async function getTicketInventory(categoryId: string) {
  return apiClient.get<TicketInventoryState>(
    `/tickets/inventory/${categoryId}`,
  );
}
