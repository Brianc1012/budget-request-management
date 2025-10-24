// src/routes/finance/nonAdmin/budgetRequest.routes.ts
// Finance Non-Admin routes - Limited to own budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { validateCreateBudgetRequest } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/finance/non-admin/budget-requests
 * View own budget requests only
 * Permission: Finance Non-Admin
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'own' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/finance/non-admin/budget-requests/:id
 * View own budget request by ID
 * Permission: Finance Non-Admin
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'own' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/finance/non-admin/budget-requests
 * Create budget request for Finance department
 * Permission: Finance Non-Admin
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/finance/non-admin/budget-requests/:id/submit
 * Submit own DRAFT budget request
 * Permission: Finance Non-Admin
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'own' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
