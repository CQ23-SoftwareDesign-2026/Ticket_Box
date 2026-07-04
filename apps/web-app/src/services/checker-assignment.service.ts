import apiClient from "./api";
import type {
  ActiveCheckerOption,
  ActiveConcertOption,
  CheckerAssignmentListResponse,
  CheckerAssignmentQuery,
  CreateCheckerAssignmentDto,
  DeleteAssignmentResponse,
  UpdateCheckerAssignmentDto,
} from "@/types/checker-assignment.types";

export async function getCheckerAssignments(
  query: CheckerAssignmentQuery = {},
): Promise<CheckerAssignmentListResponse> {
  const params = new URLSearchParams();

  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 10));

  if (query.concert_id) {
    params.set("concert_id", query.concert_id);
  }

  if (query.checker_id) {
    params.set("checker_id", query.checker_id);
  }

  return apiClient.get<CheckerAssignmentListResponse>(
    `/checkin/assignments?${params.toString()}`,
  );
}

export async function getAssignmentConcerts(): Promise<ActiveConcertOption[]> {
  return apiClient.get<ActiveConcertOption[]>("/checkin/assignments/concerts");
}

export async function getAssignmentCheckers(): Promise<ActiveCheckerOption[]> {
  return apiClient.get<ActiveCheckerOption[]>("/checkin/assignments/checkers");
}

export async function getAvailableAssignmentGates(
  concertId: string,
): Promise<number[]> {
  return apiClient.get<number[]>(`/checkin/assignments/gates/${concertId}`);
}

export async function createCheckerAssignment(
  body: CreateCheckerAssignmentDto,
) {
  return apiClient.post("/checkin/assignments", body);
}

export async function updateCheckerAssignment(
  id: string,
  body: UpdateCheckerAssignmentDto,
) {
  return apiClient.put(`/checkin/assignments/${id}`, body);
}

export async function deleteCheckerAssignment(
  id: string,
): Promise<DeleteAssignmentResponse> {
  return apiClient.delete<DeleteAssignmentResponse>(`/checkin/assignments/${id}`);
}
