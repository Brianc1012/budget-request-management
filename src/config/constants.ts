// src/config/constants.ts

export const APP_NAME = 'Budget Request Microservice';
export const API_VERSION = 'v1';
export const SERVICE_NAME = 'budget-request-microservice';

// JWT Configuration
export const JWT_SECRET = process.env.JWT_SECRET || '8f7b3a2c9d4e6f8a0b1c2d3e4f5g6h7i';
export const JWT_EXPIRES_IN = '24h';

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Cache TTL (in seconds)
export const CACHE_TTL = {
  DEPARTMENT_BUDGET: 900,      // 15 minutes
  BUDGET_REQUEST: 300,         // 5 minutes
  USER_PERMISSIONS: 3600,      // 1 hour
  ROUTE_CACHE: 300            // 5 minutes
};

// Rate Limiting
export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
  MAX_REQUESTS: 100,
  CREATE_MAX: 10
};

// Department Types
export const DEPARTMENTS = ['finance', 'hr', 'inventory', 'operations'] as const;

// Request Types
export const REQUEST_TYPES = [
  'REGULAR',
  'PROJECT_BASED',
  'BUDGET_SHORTAGE',
  'URGENT',
  'EMERGENCY'
] as const;

// Approval Status
export const APPROVAL_STATUS = ['PENDING', 'APPROVED', 'REJECTED'] as const;

// Priority Levels
export const PRIORITY_LEVELS = ['low', 'medium', 'high', 'urgent'] as const;

// Category Types
export const CATEGORY_TYPES = [
  'operational',
  'capital',
  'administrative',
  'emergency'
] as const;

// Role Levels
export const ROLE_LEVELS = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  USER: 'user'
} as const;

// Notification Types
export const NOTIFICATION_TYPES = [
  'REQUEST_SUBMITTED',
  'REQUEST_APPROVED',
  'REQUEST_REJECTED',
  'REMINDER',
  'EXPIRY_WARNING',
  'ESCALATION',
  'OVERDUE'
] as const;

// Webhook Events
export const WEBHOOK_EVENTS = [
  'budget_request.created',
  'budget_request.submitted',
  'budget_request.approved',
  'budget_request.rejected',
  'budget_request.cancelled',
  'item_allocation.approved',
  'item_allocation.modified',
  'reservation.expired'
] as const;

// External Service URLs
export const FINANCE_API_URL = process.env.FINANCE_API_URL || 'http://localhost:4001';
export const AUDIT_LOGS_API_URL = process.env.AUDIT_LOGS_API_URL || 'http://localhost:4004';

// API Keys
export const FINANCE_API_KEY = process.env.FINANCE_API_KEY;
export const AUDIT_API_KEY = process.env.AUDIT_API_KEY || 'FINANCE_DEFAULT_KEY';

// Email Configuration
export const SMTP_CONFIG = {
  HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  PORT: parseInt(process.env.SMTP_PORT || '587'),
  USER: process.env.SMTP_USER,
  PASSWORD: process.env.SMTP_PASSWORD
};

// Frontend URL for notifications
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
