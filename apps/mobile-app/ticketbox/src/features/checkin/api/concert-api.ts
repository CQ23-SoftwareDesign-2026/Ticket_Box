import { apiClient } from '@/lib/api';
import type { ConcertDetail, ConcertListResponse } from '@/features/checkin/types/checkin.types';

export const concertApi = {
  async listPublishedConcerts() {
    const response = await apiClient.get<ConcertListResponse>('/concerts', {
      params: {
        page: 1,
        limit: 50,
        status: 'PUBLISHED',
      },
    });

    return response.data;
  },

  async getConcert(id: string) {
    const response = await apiClient.get<ConcertDetail>(`/concerts/${id}`);
    return response.data;
  },
};
