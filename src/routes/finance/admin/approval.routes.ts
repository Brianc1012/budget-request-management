// src/routes/finance/admin/approval.routes.ts
// Finance Admin approval routes - Approve/reject budget requests from all departments

import { Router } from 'express';
import * as budgetRequestController from '../../../controllers/budgetRequest.controller';
import { checkPermission } from '../../../middlewares/permission.middleware';
import { verifyJWT } from '../../../middlewares/auth.middleware';
import { 
  validateApproval,
  validateRejection
} from '../../../middlewares/validation.middleware';

const router = Router();

// All routes require JWT authentication
router.use(verifyJWT);

/**
 * POST /api/finance/admin/approvals/:id/approve
 * Approve any SUBMITTED budget request (all departments)
 * Permission: Finance Admin only
 */
router.post(
  '/:id/approve',
  checkPermission({ action: 'approve', scope: 'all' }),
  validateApproval,
  budgetRequestController.approveBudgetRequest
);

/**
 * POST /api/finance/admin/approvals/:id/reject
 * Reject any SUBMITTED budget request (all departments)
 * Permission: Finance Admin only
 */
router.post(
  '/:id/reject',
  checkPermission({ action: 'approve', scope: 'all' }),
  validateRejection,
  budgetRequestController.rejectBudgetRequest
);

export default router;
