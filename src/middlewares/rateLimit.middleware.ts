// src/middlewares/rateLimit.middleware.ts
import rateLimit from 'express-rate-limit';
import { RATE_LIMIT } from '../config/constants';

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter limit for creation endpoints
export const createLimiter = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  max: RATE_LIMIT.CREATE_MAX,
  message: {
    success: false,
    message: 'Too many creation requests, please slow down',
    code: 'CREATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
