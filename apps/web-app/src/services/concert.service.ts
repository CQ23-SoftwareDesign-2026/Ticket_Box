import apiClient from "./api";

export interface ConcertApiItem {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  svg_map_url: string;
  status: string;
}

export interface ConcertTicketTier {
  id: string;
  name: string;
  price: number;
  total_quantity: number;
  max_per_user: number;
}

export interface ConcertDetailResponse {
  id: string;
  name: string;
  description: string;
  location: string;
  ai_bio: string;
  start_time: string;
  svg_map_url: string;
  status: string;
  ticketTiers: ConcertTicketTier[];
}

export interface ConcertListMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface ConcertListResponse {
  data: ConcertApiItem[];
  meta: ConcertListMeta;
}

export interface ConcertCardItem {
  id: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  price: string;
  status: string;
  genre: string;
  mapUrl: string;
}

export interface ConcertDetailItem extends ConcertCardItem {
  aiBio: string;
  ticketTiers: ConcertTicketTier[];
  startTime: string;
}

export interface ConcertQuery {
  page?: number;
  limit?: number;
  search?: string;
}

function splitLocation(location: string) {
  const separatorIndex = location.lastIndexOf(",");

  if (separatorIndex === -1) {
    return {
      venue: location.trim(),
      city: "",
    };
  }

  return {
    venue: location.slice(0, separatorIndex).trim(),
    city: location.slice(separatorIndex + 1).trim(),
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "TBA",
      time: "",
    };
  }

  return {
    date: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
  };
}

function mapConcert(item: ConcertApiItem): ConcertCardItem {
  const { venue, city } = splitLocation(item.location);
  const { date, time } = formatDateTime(item.start_time);

  return {
    id: item.id,
    title: item.name,
    description: item.description,
    venue,
    city,
    date,
    time,
    price: "See details",
    status: item.status,
    genre: "Live concert",
    mapUrl: item.svg_map_url,
  };
}

function mapConcertDetail(item: ConcertDetailResponse): ConcertDetailItem {
  const mapped = mapConcert({
    id: item.id,
    name: item.name,
    description: item.description,
    location: item.location,
    start_time: item.start_time,
    svg_map_url: item.svg_map_url,
    status: item.status,
  });

  return {
    ...mapped,
    aiBio: item.ai_bio,
    ticketTiers: item.ticketTiers ?? [],
    startTime: item.start_time,
  };
}

export async function getConcerts(query: ConcertQuery = {}) {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.search && query.search.trim()) {
    params.set("search", query.search.trim());
  }

  const isServer = typeof window === "undefined";
  const baseUrl = isServer
    ? (
        process.env.REMOTE_API_URL || "https://api.ticketbox.retrobit.io.vn"
      ).replace(/\/+$/, "")
    : "/api/proxy";
  const url = `${baseUrl}/concerts?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load concerts (${response.status})`);
  }

  const payload = (await response.json()) as Partial<ConcertListResponse>;
  const pageNumber = query.page ?? 1;
  const limit = query.limit ?? 10;
  const meta = payload.meta ?? {
    totalItems: payload.data?.length ?? 0,
    itemCount: payload.data?.length ?? 0,
    itemsPerPage: limit,
    totalPages: 1,
    currentPage: pageNumber,
  };

  return {
    items: (payload.data ?? []).map(mapConcert),
    meta,
  };
}

export async function getConcertById(id: string) {
  const isServer = typeof window === "undefined";
  const baseUrl = isServer
    ? (
        process.env.REMOTE_API_URL || "https://api.ticketbox.retrobit.io.vn"
      ).replace(/\/+$/, "")
    : "/api/proxy";
  const url = `${baseUrl}/concerts/${id}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load concert (${response.status})`);
  }

  const payload = (await response.json()) as ConcertDetailResponse;

  return mapConcertDetail(payload);
}

export function formatConcertDateTime(value: string) {
  return formatDateTime(value);
}

export function formatConcertCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export interface CreateConcertDto {
  name: string;
  description: string;
  location: string;
  ai_bio: string;
  start_time: string;
  svg_map_url: string;
  poster_url: string;
  status: string;
  ticket_categories: Array<{
    name: string;
    price: number;
    total_quantity: number;
    max_per_user: number;
  }>;
}

export async function createConcert(body: CreateConcertDto) {
  return apiClient.post<unknown>("/concerts", body);
}

export async function updateConcert(
  id: string,
  body: Partial<CreateConcertDto>,
) {
  return apiClient.patch<unknown>(`/concerts/${id}`, body);
}

export async function deleteConcert(id: string) {
  return apiClient.delete<unknown>(`/concerts/${id}`);
}
