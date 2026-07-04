import type {
  CheckinAssignment,
  ScanTicketPayload,
  ScanTicketResponse,
  SyncTicketsPayload,
  SyncTicketsResponse,
} from '@/features/checkin/types/checkin.types';
import { apiClient } from '@/lib/api';

export const checkinApi = {
  async getMyAssignments() {
    const response = await apiClient.get<CheckinAssignment[]>('/checkin/my-assignments');
    return response.data;
  },

  async prefetchTickets(concertId: string, gateNumber: number) {
    const response = await apiClient.get<string[]>(`/checkin/prefetch/${concertId}`, {
      params: {
        gate_number: gateNumber,
      },
    });

    return response.data;
  },

  async scanTicket(payload: ScanTicketPayload) {
    const response = await apiClient.post<ScanTicketResponse>('/checkin/scan', payload);
    return response.data;
  },

  async syncTickets(payload: SyncTicketsPayload) {
    const response = await apiClient.post<SyncTicketsResponse>('/checkin/sync', payload);
    return response.data;
  },
};
