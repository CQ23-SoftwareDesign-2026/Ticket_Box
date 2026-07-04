export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface AssignmentCheckerSummary {
  id: string;
  email: string;
  full_name: string;
}

export interface AssignmentConcertSummary {
  id: string;
  name: string;
  location?: string;
  start_time?: string;
}

export interface CheckerAssignmentItem {
  id: string;
  checker_id: string;
  concert_id: string;
  gate_number: number;
  created_at: string;
  updated_at: string;
  checker: AssignmentCheckerSummary;
  concert: AssignmentConcertSummary;
}

export interface CheckerAssignmentListResponse {
  data: CheckerAssignmentItem[];
  meta: PaginationMeta;
}

export interface CheckerAssignmentQuery {
  page?: number;
  limit?: number;
  concert_id?: string;
  checker_id?: string;
}

export interface CreateCheckerAssignmentDto {
  checker_id: string;
  concert_id: string;
  gate_number: number;
}

export interface UpdateCheckerAssignmentDto {
  gate_number: number;
}

export interface ActiveConcertOption {
  id: string;
  name: string;
  location: string;
  start_time: string;
}

export interface ActiveCheckerOption {
  id: string;
  email: string;
  full_name: string;
}

export interface DeleteAssignmentResponse {
  success: boolean;
  message: string;
}
