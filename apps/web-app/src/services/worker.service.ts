import { tokenStorage } from "@/utils/token.utils";
import apiClient from "./api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/proxy";

export interface GuestListItem {
  id: string;
  concert_id: string;
  email: string;
  full_name: string;
  ticket_category: string;
  is_scanned: boolean;
  scanned_at: string | null;
}

export interface GuestListResponse {
  data: GuestListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BackgroundJob {
  id: string;
  trigger_by_user_id: string;
  job_type: "GENERATE_BIO" | "GUEST_LIST_IMPORT";
  target_id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress_percentage: number;
  payload: Record<string, unknown> | null;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface BackgroundJobWithMeta extends BackgroundJob {
  concert_name: string | null;
  triggered_by_name: string | null;
  triggered_by_email: string | null;
}

export interface BackgroundJobsListResponse {
  data: BackgroundJobWithMeta[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BackgroundJobsQuery {
  page?: number;
  limit?: number;
  status?: string;
  job_type?: string;
  concert_id?: string;
}

export async function generateBio(
  concertId: string,
  file: File,
): Promise<{ job_id: string; status: BackgroundJob["status"] }> {
  const token = tokenStorage.getAccessToken();
  const formData = new FormData();
  formData.append("concert_id", concertId);
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/worker/generate-bio`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to start AI biography generation: ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json();
}

export async function importCsv(
  concertId: string,
  file: File,
): Promise<BackgroundJob> {
  const token = tokenStorage.getAccessToken();
  const formData = new FormData();
  formData.append("concert_id", concertId);
  formData.append("file", file);

  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}/worker/import-csv`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to import guest list CSV: ${response.statusText} - ${errorBody}`,
    );
  }

  return response.json();
}

export async function getJobStatus(id: string): Promise<BackgroundJob> {
  return apiClient.get<BackgroundJob>(`/worker/job/${id}`);
}

export async function getGuestList(
  concertId: string,
  params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    is_scanned?: boolean;
  } = {},
): Promise<GuestListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.search) query.append("search", params.search);
  if (params.category) query.append("category", params.category);
  if (params.is_scanned !== undefined)
    query.append("is_scanned", String(params.is_scanned));

  return apiClient.get<GuestListResponse>(
    `/worker/concert/${concertId}/guests?${query.toString()}`,
  );
}

export async function getBackgroundJobs(
  params: BackgroundJobsQuery = {},
): Promise<BackgroundJobsListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));
  if (params.status) query.append("status", params.status);
  if (params.job_type) query.append("job_type", params.job_type);
  if (params.concert_id) query.append("concert_id", params.concert_id);
  return apiClient.get<BackgroundJobsListResponse>(
    `/worker/jobs?${query.toString()}`,
  );
}
