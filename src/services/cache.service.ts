// src/services/cache.service.ts
import redis from '../config/redis';
import { CACHE_TTL } from '../config/constants';

class CacheService {
  // Cache department budget data (15 min TTL)
  async cacheDepartmentBudget(department: string, fiscalPeriod: string, data: any) {
    const key = `budget:${department}:${fiscalPeriod}`;
    await redis.setex(key, CACHE_TTL.DEPARTMENT_BUDGET, JSON.stringify(data));
  }

  async getDepartmentBudget(department: string, fiscalPeriod: string) {
    const key = `budget:${department}:${fiscalPeriod}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache budget request details (5 min TTL)
  async cacheBudgetRequest(id: number, data: any) {
    const key = `br:${id}`;
    await redis.setex(key, CACHE_TTL.BUDGET_REQUEST, JSON.stringify(data));
  }

  async getBudgetRequest(id: number) {
    const key = `br:${id}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Invalidate cache
  async invalidateBudgetRequest(id: number) {
    await redis.del(`br:${id}`);
  }

  async invalidateDepartmentBudget(department: string, fiscalPeriod: string) {
    await redis.del(`budget:${department}:${fiscalPeriod}`);
  }

  // Cache user permissions (1 hour TTL)
  async cacheUserPermissions(userId: string, permissions: any) {
    const key = `perm:${userId}`;
    await redis.setex(key, CACHE_TTL.USER_PERMISSIONS, JSON.stringify(permissions));
  }

  async getUserPermissions(userId: string) {
    const key = `perm:${userId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Clear all cache (use with caution)
  async clearAll() {
    await redis.flushdb();
  }
}

export default new CacheService();
