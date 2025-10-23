// src/middlewares/cache.middleware.ts
import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';

export const cacheResponse = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `route:${req.originalUrl}:${req.user?.id || 'anon'}`;

    try {
      // Check cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json(JSON.parse(cached));
      }

      // Override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Cache successful responses
        if (body.success !== false) {
          redis.setex(cacheKey, ttl, JSON.stringify(body)).catch(err => {
            console.error('Cache set error:', err);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};
