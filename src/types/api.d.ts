// src/types/api.d.ts

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  code?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface FilterQuery {
  status?: string;
  department?: string;
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

export interface JWTPayload {
  sub: string;        // User ID
  username: string;   // Username
  role: string;       // "Finance Admin", "Inventory Admin", etc.
  iat: number;        // Issued at
  exp: number;        // Expiration
}

export type RoleLevel = 'superadmin' | 'admin' | 'user';

export interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  error?: string;
}
