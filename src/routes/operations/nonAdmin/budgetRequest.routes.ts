// src/routes/operations/nonAdmin/budgetRequest.routes.ts
// Operations Non-Admin routes - Limited to own budget requests

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { validateCreateBudgetRequest } from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * GET /api/operations/non-admin/budget-requests
 * View own budget requests only
 * Permission: Operations Non-Admin
 */
router.get(
  '/',
  checkPermission({ action: 'view', scope: 'own' }),
  budgetRequestController.listBudgetRequests
);

/**
 * GET /api/operations/non-admin/budget-requests/:id
 * View own budget request by ID
 * Permission: Operations Non-Admin
 */
router.get(
  '/:id',
  checkPermission({ action: 'view', scope: 'own' }),
  budgetRequestController.getBudgetRequest
);

/**
 * POST /api/operations/non-admin/budget-requests
 * Create budget request for Operations department
 * Permission: Operations Non-Admin
 */
router.post(
  '/',
  checkPermission({ action: 'create', scope: 'department' }),
  validateCreateBudgetRequest,
  budgetRequestController.createBudgetRequest
);

/**
 * POST /api/operations/non-admin/budget-requests/:id/submit
 * Submit own DRAFT budget request
 * Permission: Operations Non-Admin
 */
router.post(
  '/:id/submit',
  checkPermission({ action: 'submit', scope: 'own' }),
  budgetRequestController.submitBudgetRequest
);

export default router;
