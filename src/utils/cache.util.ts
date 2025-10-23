// src/utils/cache.util.ts
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';

/**
 * ────────────────────────────────────────────────────────────────
 * 🚀 Hybrid Cache Utility (Redis + LRU Fallback)
 * ────────────────────────────────────────────────────────────────
 * 
 * Three-tier caching strategy:
 * 1. Redis (Upstash TLS) - Primary distributed cache
 * 2. REST API (Upstash HTTP) - Serverless fallback
 * 3. LRU Cache (In-Memory) - Local fallback
 * 
 * Features:
 * ✅ Automatic fallback on connection failures
 * ✅ TTL support (Time To Live)
 * ✅ Pattern-based invalidation
 * ✅ User-aware cache keys (role-based access)
 * ✅ Service namespace isolation
 * ✅ Graceful degradation
 * 
 * Usage:
 * ```typescript
 * import cache from '../utils/cache.util';
 * 
 * // Simple wrapper (recommended)
 * const data = await cache.withCache(
 *   cacheKey,
 *   () => fetchFromDatabase(),
 *   300 // TTL in seconds
 * );
 * 
 * // Manual operations
 * await cache.setCache(key, value, ttl);
 * const value = await cache.getCache<T>(key);
 * await cache.deleteCache(key);
 * ```
 */

// ────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────

const CACHE_ENABLED = process.env.ENABLE_CACHE === 'true';
const REDIS_URL = process.env.REDIS_URL || '';
const DEFAULT_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '300');
const SERVICE_NAME = process.env.SERVICE_NAME || 'budget';

// REST API fallback (Upstash HTTP API)
const UPSTASH_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';

// ────────────────────────────────────────────────────────────────
// LRU Cache Configuration (Local Memory Fallback)
// ────────────────────────────────────────────────────────────────

const lruCache = new LRUCache<string, any>({
  max: 500, // Maximum 500 items
  maxSize: 50 * 1024 * 1024, // 50MB max size
  sizeCalculation: (value) => {
    return JSON.stringify(value).length;
  },
  ttl: DEFAULT_TTL * 1000, // TTL in milliseconds
  allowStale: false,
  updateAgeOnGet: true,
  updateAgeOnHas: false,
});

// ────────────────────────────────────────────────────────────────
// Redis Client Configuration
// ────────────────────────────────────────────────────────────────

let redisClient: Redis | null = null;
let redisAvailable = false;

if (CACHE_ENABLED && REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      lazyConnect: true,
      showFriendlyErrorStack: process.env.NODE_ENV === 'development',
    });

    // Event handlers
    redisClient.on('connect', () => {
      console.log('✅ Redis cache connected');
      redisAvailable = true;
    });

    redisClient.on('ready', () => {
      console.log(`✅ Redis cache enabled: ${maskCredentials(REDIS_URL)}`);
      redisAvailable = true;
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      redisAvailable = false;
    });

    redisClient.on('close', () => {
      console.log('⚠️  Redis connection closed');
      redisAvailable = false;
    });

    // Try to connect
    redisClient.connect().catch((err) => {
      console.error('⚠️  Failed to connect to Redis:', err.message);
      console.log('⚠️  Redis unavailable. Local cache fallback active.');
      redisAvailable = false;
    });
  } catch (error: any) {
    console.error('⚠️  Redis initialization error:', error.message);
    console.log('⚠️  Redis unavailable. Local cache fallback active.');
    redisAvailable = false;
  }
} else if (!CACHE_ENABLED) {
  console.log('ℹ️  Cache disabled (ENABLE_CACHE=false)');
} else {
  console.log('⚠️  Redis URL not configured. Local cache fallback active.');
}

// ────────────────────────────────────────────────────────────────
// Utility Functions
// ────────────────────────────────────────────────────────────────

/**
 * Mask sensitive credentials in URLs for logging
 */
function maskCredentials(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return url.replace(/:[^:@]+@/, ':***@');
  }
}

/**
 * Generate a consistent cache key from namespace and parameters
 */
function generateCacheKey(namespace: string, params: Record<string, any> = {}): string {
  // Sort keys to ensure consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, any>);

  const paramsString = JSON.stringify(sortedParams);
  return `${SERVICE_NAME}:${namespace}:${paramsString}`;
}

/**
 * Generate user-aware cache key (includes user ID and role)
 */
function generateUserCacheKey(
  namespace: string,
  userId: string,
  userRole: string,
  params: Record<string, any> = {}
): string {
  return generateCacheKey(namespace, {
    ...params,
    userId,
    userRole,
  });
}

// ────────────────────────────────────────────────────────────────
// REST API Fallback Functions
// ────────────────────────────────────────────────────────────────

/**
 * Get value from Upstash REST API
 */
async function getFromRest(key: string): Promise<any> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${UPSTASH_REST_URL}/get/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.result) {
      return JSON.parse(data.result);
    }
    return null;
  } catch (error: any) {
    console.error('REST API get error:', error.message);
    return null;
  }
}

/**
 * Set value in Upstash REST API
 */
async function setInRest(key: string, value: any, ttlInSeconds: number): Promise<void> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    await fetch(`${UPSTASH_REST_URL}/setex/${key}/${ttlInSeconds}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
      body: serialized,
    });
  } catch (error: any) {
    console.error('REST API set error:', error.message);
  }
}

/**
 * Delete value from Upstash REST API
 */
async function deleteFromRest(key: string): Promise<void> {
  if (!UPSTASH_REST_URL || !UPSTASH_REST_TOKEN) {
    return;
  }

  try {
    await fetch(`${UPSTASH_REST_URL}/del/${key}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_REST_TOKEN}`,
      },
    });
  } catch (error: any) {
    console.error('REST API delete error:', error.message);
  }
}

// ────────────────────────────────────────────────────────────────
// Core Cache Functions
// ────────────────────────────────────────────────────────────────

/**
 * Get value from cache (tries Redis → REST → LRU)
 */
async function getCache<T = any>(key: string): Promise<T | null> {
  if (!CACHE_ENABLED) {
    return null;
  }

  try {
    // Try Redis first
    if (redisClient && redisAvailable) {
      const cached = await redisClient.get(key);
      if (cached) {
        console.log(`✅ Cache hit (Redis): ${key}`);
        return JSON.parse(cached) as T;
      }
    }

    // Try REST API fallback
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      const restValue = await getFromRest(key);
      if (restValue) {
        console.log(`✅ Cache hit (REST): ${key}`);
        return restValue as T;
      }
    }

    // Try LRU cache
    const lruValue = lruCache.get(key);
    if (lruValue !== undefined) {
      console.log(`✅ Cache hit (LRU): ${key}`);
      return lruValue as T;
    }

    // Cache miss
    console.log(`❌ Cache miss: ${key}`);
    return null;
  } catch (error: any) {
    console.error(`Cache get error for key "${key}":`, error.message);
    return null;
  }
}

/**
 * Set value in cache (stores in Redis + REST + LRU)
 */
async function setCache(key: string, value: any, ttlInSeconds: number = DEFAULT_TTL): Promise<void> {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);

    // Store in Redis
    if (redisClient && redisAvailable) {
      await redisClient.setex(key, ttlInSeconds, serialized);
      console.log(`💾 Cached (Redis): ${key} [TTL: ${ttlInSeconds}s]`);
    }

    // Store in REST API
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      await setInRest(key, value, ttlInSeconds);
      console.log(`💾 Cached (REST): ${key} [TTL: ${ttlInSeconds}s]`);
    }

    // Store in LRU cache
    lruCache.set(key, value, { ttl: ttlInSeconds * 1000 });
    console.log(`💾 Cached (LRU): ${key} [TTL: ${ttlInSeconds}s]`);
  } catch (error: any) {
    console.error(`Cache set error for key "${key}":`, error.message);
  }
}

/**
 * Delete value from cache (removes from Redis + REST + LRU)
 */
async function deleteCache(key: string): Promise<void> {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    // Delete from Redis
    if (redisClient && redisAvailable) {
      await redisClient.del(key);
    }

    // Delete from REST API
    if (UPSTASH_REST_URL && UPSTASH_REST_TOKEN) {
      await deleteFromRest(key);
    }

    // Delete from LRU cache
    lruCache.delete(key);

    console.log(`🗑️  Deleted cache: ${key}`);
  } catch (error: any) {
    console.error(`Cache delete error for key "${key}":`, error.message);
  }
}

/**
 * Cache wrapper function - tries cache first, then executes function
 */
async function withCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  // Try to get from cache
  const cached = await getCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fetchFunction();

  // Store in cache (don't await - fire and forget)
  setCache(key, result, ttl).catch((err) => {
    console.error('Failed to cache result:', err.message);
  });

  return result;
}

// ────────────────────────────────────────────────────────────────
// Pattern-Based Invalidation
// ────────────────────────────────────────────────────────────────

/**
 * Invalidate cache keys matching a pattern (e.g., "budget:requests:*")
 */
async function invalidatePattern(pattern: string): Promise<number> {
  if (!CACHE_ENABLED) {
    return 0;
  }

  let deletedCount = 0;

  try {
    // Invalidate in Redis
    if (redisClient && redisAvailable) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
        deletedCount += keys.length;
        console.log(`🗑️  Invalidated ${keys.length} cache keys (Redis) matching: ${pattern}`);
      }
    }

    // Invalidate in LRU cache (check all keys)
    let lruDeletedCount = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of lruCache.keys()) {
      if (regex.test(key)) {
        lruCache.delete(key);
        lruDeletedCount++;
      }
    }
    if (lruDeletedCount > 0) {
      console.log(`🗑️  Invalidated ${lruDeletedCount} cache keys (LRU) matching: ${pattern}`);
    }
    deletedCount += lruDeletedCount;

    return deletedCount;
  } catch (error: any) {
    console.error(`Pattern invalidation error for "${pattern}":`, error.message);
    return deletedCount;
  }
}

/**
 * Invalidate all budget request caches
 */
async function invalidateBudgetRequests(): Promise<number> {
  return await invalidatePattern(`${SERVICE_NAME}:requests:*`);
}

/**
 * Invalidate all analytics caches
 */
async function invalidateAnalytics(): Promise<number> {
  return await invalidatePattern(`${SERVICE_NAME}:analytics:*`);
}

/**
 * Invalidate service-specific caches
 */
async function invalidateService(serviceName: string): Promise<number> {
  return await invalidatePattern(`${serviceName}:*`);
}

// ────────────────────────────────────────────────────────────────
// Cleanup & Monitoring
// ────────────────────────────────────────────────────────────────

/**
 * Disconnect from Redis gracefully
 */
async function disconnect(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    console.log('✅ Redis connection closed gracefully');
  }
}

/**
 * Clear all caches (use with caution!)
 */
async function clearAll(): Promise<void> {
  if (!CACHE_ENABLED) {
    return;
  }

  try {
    // Clear Redis
    if (redisClient && redisAvailable) {
      await redisClient.flushdb();
      console.log('🗑️  Cleared all Redis cache');
    }

    // Clear LRU cache
    lruCache.clear();
    console.log('🗑️  Cleared all LRU cache');
  } catch (error: any) {
    console.error('Clear all error:', error.message);
  }
}

/**
 * Get cache statistics
 */
function getStats() {
  return {
    enabled: CACHE_ENABLED,
    redisAvailable,
    lruSize: lruCache.size,
    lruMaxSize: lruCache.max,
    defaultTTL: DEFAULT_TTL,
    serviceName: SERVICE_NAME,
  };
}

// ────────────────────────────────────────────────────────────────
// Exports
// ────────────────────────────────────────────────────────────────

const cache = {
  // Basic operations
  getCache,
  setCache,
  deleteCache,
  withCache,

  // Key generation
  generateCacheKey,
  generateUserCacheKey,

  // Invalidation
  invalidatePattern,
  invalidateBudgetRequests,
  invalidateAnalytics,
  invalidateService,

  // Utilities
  disconnect,
  clearAll,
  getStats,

  // Direct access (advanced use only)
  redis: redisClient,
  lru: lruCache,
};

export default cache;
