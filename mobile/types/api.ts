export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginatedMeta;
}
