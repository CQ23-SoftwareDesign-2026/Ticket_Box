export type TicketTier = {
  id: string;
  name: string;
  price: number;
  total_quantity: number;
  max_per_user: number;
  gate_number?: number | null;
};

export type ConcertListItem = {
  id: string;
  name: string;
  description?: string | null;
  location: string;
  start_time: string;
  svg_map_url?: string | null;
  poster_url?: string | null;
  status: string;
};

export type ConcertListResponse = {
  data: ConcertListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ConcertDetail = {
  id: string;
  name: string;
  description?: string | null;
  location: string;
  ai_bio?: string | null;
  start_time: string;
  svg_map_url?: string | null;
  poster_url?: string | null;
  status: string;
  ticketTiers: TicketTier[];
};

export type ScanTicketPayload = {
  concert_id: string;
  gate_id: number;
  qr_code_hash: string;
  scanned_at?: string;
};

export type ScanTicketStatus = 'ACCEPTED' | 'DUPLICATE' | 'INVALID_GATE' | 'NOT_FOUND' | 'UNPAID';

export type ScanTicketResponse = {
  status: ScanTicketStatus;
  scanned_at?: string;
  scanned_by?: string;
};
