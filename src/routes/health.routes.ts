// src/routes/health.routes.ts
import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import redis from '../config/redis';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis (optional - don't fail if unavailable)
    let redisStatus = 'unavailable';
    try {
      await redis.ping();
      redisStatus = 'healthy';
    } catch (redisError) {
      // Redis is optional - don't fail health check
      redisStatus = 'unavailable (cache fallback active)';
    }

    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
      service: 'budget-request-microservice',
      checks: {
        database: 'healthy',
        redis: redisStatus
      }
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      message: 'Service is unhealthy',
      timestamp: new Date().toISOString(),
      service: 'budget-request-microservice',
      error: error.message
    });
  }
});

export default router;
