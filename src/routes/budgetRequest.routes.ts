// src/routes/budgetRequest.routes.ts
import express from 'express';
import { verifyJWT } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/roleAccess.middleware';
import { cacheResponse } from '../middlewares/cache.middleware';
import { validateCreateBudgetRequest, validateApproval, validateRejection } from '../middlewares/validation.middleware';
import { createLimiter } from '../middlewares/rateLimit.middleware';
import * as controller from '../controllers/budgetRequest.controller';

const router = express.Router();

// All routes require JWT authentication
router.use(verifyJWT);

// List budget requests (cached for 5 minutes)
router.get(
  '/',
  cacheResponse(300),
  controller.listBudgetRequests
);

// Get single budget request
router.get('/:id', controller.getBudgetRequest);

// Create new budget request
router.post(
  '/',
  createLimiter,
  requireRole('admin', 'user'),
  validateCreateBudgetRequest,
  controller.createBudgetRequest
);

// Submit budget request for approval
router.post(
  '/:id/submit',
  requireRole('admin', 'user'),
  controller.submitBudgetRequest
);

// Approve budget request (admin only)
router.post(
  '/:id/approve',
  requireRole('admin', 'superadmin'),
  validateApproval,
  controller.approveBudgetRequest
);

// Reject budget request (admin only)
router.post(
  '/:id/reject',
  requireRole('admin', 'superadmin'),
  validateRejection,
  controller.rejectBudgetRequest
);

export default router;
