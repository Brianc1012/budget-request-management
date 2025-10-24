// src/routes/inventory/admin/budgetRequest.routes.ts
// Inventory Admin routes - Limited to Inventory department budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { validateCreateBudgetRequest } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/inventory/admin/budget-requests
 * View all Inventory department budget requests
 * Permission: Inventory Admin only
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/inventory/admin/budget-requests/:id
 * View Inventory department budget request by ID
 * Permission: Inventory Admin only
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'department' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/inventory/admin/budget-requests
 * Create budget request for Inventory department
 * Permission: Inventory Admin only
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/inventory/admin/budget-requests/:id/submit
 * Submit Inventory department DRAFT budget request
 * Permission: Inventory Admin only
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'department' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
