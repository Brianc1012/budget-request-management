// src/middlewares/errorHandler.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { errorResponse } from '../utils/response.util';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Prisma errors
  if (err.code === 'P2002') {
    return errorResponse(res, 'A record with this value already exists', 409, 'DUPLICATE_ENTRY');
  }

  if (err.code === 'P2025') {
    return errorResponse(res, 'Record not found', 404, 'NOT_FOUND');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return errorResponse(res, err.message, 400, 'VALIDATION_ERROR');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }

  // Default error
  return errorResponse(
    res,
    err.message || 'Internal server error',
    err.statusCode || 500,
    err.code || 'INTERNAL_ERROR'
  );
};

export const notFoundHandler = (req: Request, res: Response) => {
  return errorResponse(res, `Route ${req.path} not found`, 404, 'ROUTE_NOT_FOUND');
};
