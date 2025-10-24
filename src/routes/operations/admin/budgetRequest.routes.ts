// src/routes/operations/admin/budgetRequest.routes.ts
// Operations Admin routes - Limited to Operations department budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { validateCreateBudgetRequest } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/operations/admin/budget-requests
 * View all Operations department budget requests
 * Permission: Operations Admin only
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/operations/admin/budget-requests/:id
 * View Operations department budget request by ID
 * Permission: Operations Admin only
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/operations/admin/budget-requests
 * Create budget request for Operations department
 * Permission: Operations Admin only
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/operations/admin/budget-requests/:id/submit
 * Submit Operations department DRAFT budget request
 * Permission: Operations Admin only
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'department' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
