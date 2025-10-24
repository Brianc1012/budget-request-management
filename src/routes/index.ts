// src/routes/index.ts
// Main router aggregating all department-based routes
import express from 'express';
import analyticsRoutes from './analytics.routes';
import healthRoutes from './health.routes';

// Finance Department Routes
import financeAdminBudgetRoutes from './finance/admin/budgetRequest.routes';
import financeAdminApprovalRoutes from './finance/admin/approval.routes';
import financeNonAdminBudgetRoutes from './finance/nonAdmin/budgetRequest.routes';

// HR Department Routes
import hrAdminBudgetRoutes from './hr/admin/budgetRequest.routes';
import hrNonAdminBudgetRoutes from './hr/nonAdmin/budgetRequest.routes';

// Inventory Department Routes
import inventoryAdminBudgetRoutes from './inventory/admin/budgetRequest.routes';
import inventoryNonAdminBudgetRoutes from './inventory/nonAdmin/budgetRequest.routes';

// Operations Department Routes
import operationsAdminBudgetRoutes from './operations/admin/budgetRequest.routes';
import operationsNonAdminBudgetRoutes from './operations/nonAdmin/budgetRequest.routes';

const router = express.Router();

// Health check (no auth required)
router.use('/health', healthRoutes);

// Finance Department - Admin Routes
router.use('/finance/admin/budget-requests', financeAdminBudgetRoutes);
router.use('/finance/admin/approvals', financeAdminApprovalRoutes);

// Finance Department - Non-Admin Routes
router.use('/finance/non-admin/budget-requests', financeNonAdminBudgetRoutes);

// HR Department - Admin Routes
router.use('/hr/admin/budget-requests', hrAdminBudgetRoutes);

// HR Department - Non-Admin Routes
router.use('/hr/non-admin/budget-requests', hrNonAdminBudgetRoutes);

// Inventory Department - Admin Routes
router.use('/inventory/admin/budget-requests', inventoryAdminBudgetRoutes);

// Inventory Department - Non-Admin Routes
router.use('/inventory/non-admin/budget-requests', inventoryNonAdminBudgetRoutes);

// Operations Department - Admin Routes
router.use('/operations/admin/budget-requests', operationsAdminBudgetRoutes);

// Operations Department - Non-Admin Routes
router.use('/operations/non-admin/budget-requests', operationsNonAdminBudgetRoutes);

// Analytics routes (Finance Admin only)
router.use('/analytics', analyticsRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Budget Request Microservice API',
    version: '2.0.0',
    architecture: 'Department-based routes with role-based access control',
    endpoints: {
      health: '/api/health',
      finance: {
        admin: {
          budgetRequests: '/api/finance/admin/budget-requests',
          approvals: '/api/finance/admin/approvals'
        },
        nonAdmin: {
          budgetRequests: '/api/finance/non-admin/budget-requests'
        }
      },
      hr: {
        admin: { budgetRequests: '/api/hr/admin/budget-requests' },
        nonAdmin: { budgetRequests: '/api/hr/non-admin/budget-requests' }
      },
      inventory: {
        admin: { budgetRequests: '/api/inventory/admin/budget-requests' },
        nonAdmin: { budgetRequests: '/api/inventory/non-admin/budget-requests' }
      },
      operations: {
        admin: { budgetRequests: '/api/operations/admin/budget-requests' },
        nonAdmin: { budgetRequests: '/api/operations/non-admin/budget-requests' }
      },
      analytics: '/api/analytics'
    }
  });
});

export default router;
