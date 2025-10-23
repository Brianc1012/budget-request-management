// src/utils/response.util.ts
import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types/api';

export function successResponse<T>(
  res: Response,
  data: T,
  message: string = 'Success',
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data
  };
  return res.status(statusCode).json(response);
}

export function successResponseWithPagination<T>(
  res: Response,
  data: T,
  meta: PaginationMeta,
  message: string = 'Success'
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta
  };
  return res.status(200).json(response);
}

export function errorResponse(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  error?: string
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    code,
    error
  };
  return res.status(statusCode).json(response);
}

export function validationErrorResponse(
  res: Response,
  errors: any[]
): Response {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    code: 'VALIDATION_ERROR',
    errors
  });
}

export function notFoundResponse(
  res: Response,
  resource: string = 'Resource'
): Response {
  return errorResponse(res, `${resource} not found`, 404, 'NOT_FOUND');
}

export function unauthorizedResponse(
  res: Response,
  message: string = 'Unauthorized'
): Response {
  return errorResponse(res, message, 401, 'UNAUTHORIZED');
}

export function forbiddenResponse(
  res: Response,
  message: string = 'Access forbidden'
): Response {
  return errorResponse(res, message, 403, 'FORBIDDEN');
}
