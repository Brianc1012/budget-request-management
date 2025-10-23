// src/routes/index.ts
import express from 'express';
import budgetRequestRoutes from './budgetRequest.routes';
import analyticsRoutes from './analytics.routes';
import healthRoutes from './health.routes';

const router = express.Router();

// Health check (no auth required)
router.use('/health', healthRoutes);

// Budget request routes
router.use('/budget-requests', budgetRequestRoutes);

// Analytics routes
router.use('/analytics', analyticsRoutes);

// API root
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Budget Request Microservice API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      budgetRequests: '/api/budget-requests',
      analytics: '/api/analytics'
    }
  });
});

export default router;
