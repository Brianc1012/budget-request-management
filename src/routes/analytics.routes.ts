// src/routes/analytics.routes.ts
import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { verifyJWT } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @route   GET /api/analytics/department/:department/summary
 * @desc    Get department budget summary
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/department/:department/summary',
  verifyJWT,
  analyticsController.getDepartmentSummary
);

/**
 * @route   GET /api/analytics/department/summary
 * @desc    Get current user's department summary
 * @access  Private
 */
router.get(
  '/department/summary',
  verifyJWT,
  analyticsController.getDepartmentSummary
);

/**
 * @route   GET /api/analytics/spending-trends
 * @desc    Get spending trends over time
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/spending-trends',
  verifyJWT,
  analyticsController.getSpendingTrends
);

/**
 * @route   GET /api/analytics/approval-metrics
 * @desc    Get approval performance metrics
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/approval-metrics',
  verifyJWT,
  analyticsController.getApprovalMetrics
);

/**
 * @route   GET /api/analytics/top-requesters
 * @desc    Get top requesters by count and amount
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/top-requesters',
  verifyJWT,
  analyticsController.getTopRequesters
);

/**
 * @route   GET /api/analytics/category-breakdown
 * @desc    Get budget breakdown by category
 * @access  Private (Admin, SuperAdmin)
 */
router.get(
  '/category-breakdown',
  verifyJWT,
  analyticsController.getCategoryBreakdown
);

export default router;
