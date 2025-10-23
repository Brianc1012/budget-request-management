// src/config/redis.ts
import Redis from 'ioredis';

// NOTE: This is the legacy Redis configuration.
// If ENABLE_CACHE=true, the new cache utility (src/utils/cache.util.ts) is used instead.
// This file is kept for backward compatibility with health checks and old cache service.

let redis: Redis;

// Use new cache utility if enabled, otherwise use legacy connection
if (process.env.ENABLE_CACHE === 'true' && process.env.REDIS_URL) {
  // Use the same Redis URL as the new cache utility
  redis = new Redis(process.env.REDIS_URL, {
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

  redis.on('error', (err) => {
    // Suppress error logging as cache.util.ts handles this
    if (process.env.NODE_ENV === 'development') {
      console.error('Legacy Redis error:', err.message);
    }
  });

  redis.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Legacy Redis connected (using REDIS_URL)');
    }
  });

  // Connect
  redis.connect().catch(() => {
    // Suppress connection errors - cache.util.ts handles fallback
  });
} else {
  // Legacy configuration (localhost)
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
  });

  redis.on('error', (err) => {
    console.error('Redis connection error:', err);
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });
}

export default redis;
