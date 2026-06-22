import type { ScanTicketPayload, ScanTicketResponse } from '@/features/checkin/types/checkin.types';
import { apiClient } from '@/lib/api';

export const checkinApi = {
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
};
