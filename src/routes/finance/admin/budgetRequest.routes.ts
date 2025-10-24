// src/routes/finance/admin/budgetRequest.routes.ts
// Finance Admin routes - Full access to all departments' budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { 
  validateCreateBudgetRequest,
  validateApproval
} from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/finance/admin/budget-requests
 * View all budget requests from all departments
 * Permission: Finance Admin only
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'all' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/finance/admin/budget-requests/:id
 * View any budget request by ID (all departments)
 * Permission: Finance Admin only
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'all' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/finance/admin/budget-requests
 * Create budget request for Finance department
 * Permission: Finance Admin only
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/finance/admin/budget-requests/:id/submit
 * Submit any DRAFT budget request (all departments)
 * Permission: Finance Admin only
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'all' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
