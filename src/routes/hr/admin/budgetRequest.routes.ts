// src/routes/hr/admin/budgetRequest.routes.ts
// HR Admin routes - Limited to HR department budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { validateCreateBudgetRequest } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/hr/admin/budget-requests
 * View all HR department budget requests
 * Permission: HR Admin only
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/hr/admin/budget-requests/:id
 * View HR department budget request by ID
 * Permission: HR Admin only
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/hr/admin/budget-requests
 * Create budget request for HR department
 * Permission: HR Admin only
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/hr/admin/budget-requests/:id/submit
 * Submit HR department DRAFT budget request
 * Permission: HR Admin only
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'department' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
