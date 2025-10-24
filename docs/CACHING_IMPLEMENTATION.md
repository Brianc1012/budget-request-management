# Caching Implementation Summary

## Overview
Implemented strategic caching for budget request operations to improve performance and reduce database load.

## Caching Strategy

### ✅ Operations WITH Caching (READ Operations)

#### 1. List Budget Requests
**Endpoint:** `GET /api/{department}/admin/budget-requests` or `/api/{department}/non-admin/budget-requests`

**Implementation:**
```typescript
const cacheKey = cache.generateUserCacheKey(
  'requests:list',
  req.user!.id.toString(),
  req.user!.role,
  { page, limit, status, department, priority, dateFrom, dateTo, search }
);

const result = await cache.withCache(
  cacheKey,
  async () => {
    // Fetch from database
    const [data, total] = await Promise.all([
      service.findMany(filter, options),
      service.count(filter)
    ]);
    return { data, total };
  },
  180 // 3 minutes TTL
);
```

**Why:**
- Most frequently accessed operation
- Expensive with filters, sorting, pagination
- Same query repeated by multiple users
- User-aware caching ensures role-based security

**TTL:** 3 minutes (180 seconds)
- Balance between data freshness and performance
- Lists change frequently with new requests

**Cache Key Pattern:** `budget:requests:list:{"page":1,"limit":10,"status":"APPROVED","userId":"1","userRole":"Finance Admin",...}`

---

#### 2. Get Budget Request Details
**Endpoint:** `GET /api/{department}/admin/budget-requests/:id`

**Implementation:**
```typescript
const cacheKey = cache.generateCacheKey('requests:detail', { id: Number(id) });

const budgetRequest = await cache.withCache(
  cacheKey,
  async () => await service.findById(Number(id)),
  600 // 10 minutes TTL
);
```

**Why:**
- Frequently accessed for reviews, approvals
- Same record viewed multiple times
- Relatively static data (changes only on updates)
- Less variation than list queries

**TTL:** 10 minutes (600 seconds)
- Details are more stable than lists
- Longer TTL reduces database hits significantly

**Cache Key Pattern:** `budget:requests:detail:{"id":123}`

---

### ❌ Operations WITHOUT Caching (WRITE Operations)

#### 3. Create Budget Request
**Endpoint:** `POST /api/{department}/non-admin/budget-requests`

**Cache Invalidation:**
```typescript
await cache.invalidateBudgetRequests();  // Clear all list caches
await cache.invalidateAnalytics();       // Clear analytics caches
```

**Why No Cache:**
- Write operation - creates new data
- Must hit database for data integrity
- Transaction-critical

---

#### 4. Submit Budget Request
**Endpoint:** `POST /api/{department}/non-admin/budget-requests/:id/submit`

**Cache Invalidation:**
```typescript
await cache.deleteCache(cache.generateCacheKey('requests:detail', { id }));
await cache.invalidateBudgetRequests();
await cache.invalidateAnalytics();
```

**Why No Cache:**
- Write operation - changes status from DRAFT to SUBMITTED
- Status change affects list filters
- Detail must be immediately up-to-date

---

#### 5. Approve Budget Request
**Endpoint:** `POST /api/finance/admin/budget-requests/:id/approve`

**Cache Invalidation:**
```typescript
await cache.deleteCache(cache.generateCacheKey('requests:detail', { id }));
await cache.invalidateBudgetRequests();
await cache.invalidateAnalytics();
```

**Why No Cache:**
- Write operation - changes status to APPROVED
- Updates reserved amounts
- Critical for financial accuracy

---

#### 6. Reject Budget Request
**Endpoint:** `POST /api/finance/admin/budget-requests/:id/reject`

**Cache Invalidation:**
```typescript
await cache.deleteCache(cache.generateCacheKey('requests:detail', { id }));
await cache.invalidateBudgetRequests();
await cache.invalidateAnalytics();
```

**Why No Cache:**
- Write operation - changes status to REJECTED
- Adds rejection notes
- Immediate feedback required

---

## Cache Architecture

### Three-Tier Hybrid System

**Tier 1: Redis (Upstash TLS)**
- Primary distributed cache
- URL: `rediss://bold-redbird-6859.upstash.io:6379`
- Status: ✅ Connected
- Shared across all service instances
- Persistent across restarts

**Tier 2: REST API (Upstash HTTP)**
- Serverless fallback
- Used if Redis TCP connection fails
- Same data, different protocol

**Tier 3: LRU Cache (In-Memory)**
- Local fallback if both Redis options fail
- Max 500 items, 50MB limit
- Process-specific (not shared)

### Cache Flow

```
┌─────────────┐
│ API Request │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Cache Check    │
│  1. Redis       │───► HIT ──► Return Cached
│  2. REST API    │           
│  3. LRU Memory  │
└────────┬────────┘
         │ MISS
         ▼
┌─────────────────┐
│ Query Database  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Store in All   │
│  - Redis        │
│  - REST API     │
│  - LRU Memory   │
└────────┬────────┘
         │
         ▼
    Return Data
```

---

## Cache Key Strategies

### 1. User-Aware Keys (Lists)
```typescript
cache.generateUserCacheKey(
  'requests:list',
  userId,
  userRole,
  { page, limit, status, ... }
)
```

**Result:** `budget:requests:list:{"page":1,"limit":10,"userId":"1","userRole":"Finance Admin",...}`

**Why:**
- Different users see different data based on role/department
- Finance Admin sees all departments
- Department Admin sees own department
- Staff sees own requests only

### 2. Simple Keys (Details)
```typescript
cache.generateCacheKey('requests:detail', { id })
```

**Result:** `budget:requests:detail:{"id":123}`

**Why:**
- Same request data for all authorized users
- Access control checked after cache retrieval
- Simpler key = better cache hit rate

---

## Invalidation Strategy

### Pattern-Based Invalidation

**List Cache Invalidation:**
```typescript
await cache.invalidateBudgetRequests();
// Clears: budget:requests:list:*
```

**Analytics Cache Invalidation:**
```typescript
await cache.invalidateAnalytics();
// Clears: budget:analytics:*
```

**Specific Detail Invalidation:**
```typescript
await cache.deleteCache(cache.generateCacheKey('requests:detail', { id }));
// Clears: budget:requests:detail:{"id":123}
```

### When Invalidation Happens

| Operation | Invalidates |
|-----------|-------------|
| Create Request | List + Analytics |
| Submit Request | Detail + List + Analytics |
| Approve Request | Detail + List + Analytics |
| Reject Request | Detail + List + Analytics |

---

## Performance Impact

### Expected Improvements

**List Endpoint:**
- **Before:** ~50-200ms per request (database query)
- **After (Cache Hit):** ~5-20ms (Redis retrieval)
- **Improvement:** 70-90% reduction in response time

**Detail Endpoint:**
- **Before:** ~30-100ms per request (database query)
- **After (Cache Hit):** ~5-15ms (Redis retrieval)
- **Improvement:** 80-90% reduction in response time

**Database Load:**
- **Reduction:** 60-80% fewer queries during peak hours
- **Benefit:** More capacity for write operations

### Cache Hit Ratios (Expected)

**List Endpoint:**
- **Expected Hit Rate:** 40-60%
- **Reason:** Varies by user, filters, pagination

**Detail Endpoint:**
- **Expected Hit Rate:** 70-85%
- **Reason:** Same requests viewed multiple times

---

## Monitoring

### Cache Statistics
```typescript
const stats = cache.getStats();
console.log(stats);
```

**Output:**
```json
{
  "enabled": true,
  "redisAvailable": true,
  "lruSize": 127,
  "lruMaxSize": 500,
  "defaultTTL": 300,
  "serviceName": "budget"
}
```

### Log Messages

**Cache Hit:**
```
✅ Cache hit (Redis): budget:requests:list:{"page":1,...}
```

**Cache Miss:**
```
❌ Cache miss: budget:requests:list:{"page":1,...}
💾 Cached (Redis): budget:requests:list:{"page":1,...} [TTL: 180s]
```

**Cache Invalidation:**
```
🗑️ Invalidated 15 cache keys (Redis) matching: budget:requests:list:*
🗑️ Deleted cache: budget:requests:detail:{"id":123}
```

---

## Configuration

### Environment Variables

```env
# Enable/disable caching
ENABLE_CACHE=true

# Redis connection
REDIS_URL=rediss://default:***@bold-redbird-6859.upstash.io:6379

# REST API fallback
UPSTASH_REDIS_REST_URL=https://bold-redbird-6859.upstash.io
UPSTASH_REDIS_REST_TOKEN=***

# Cache TTL (default for manual operations)
CACHE_TTL_SECONDS=300

# Service namespace
SERVICE_NAME=budget
```

---

## Testing Caching

### 1. Test Cache Hit (List)
```bash
# First request - cache miss, slow
curl -X GET "http://localhost:4005/api/finance/admin/budget-requests?page=1&limit=10" \
  -H "x-mock-role: Finance Admin" \
  -H "x-mock-department: finance"

# Second request - cache hit, fast
curl -X GET "http://localhost:4005/api/finance/admin/budget-requests?page=1&limit=10" \
  -H "x-mock-role: Finance Admin" \
  -H "x-mock-department: finance"
```

**Expected Logs:**
```
❌ Cache miss: budget:requests:list:{...}
💾 Cached (Redis): budget:requests:list:{...} [TTL: 180s]

✅ Cache hit (Redis): budget:requests:list:{...}
```

### 2. Test Cache Invalidation
```bash
# View request (cached)
curl -X GET "http://localhost:4005/api/finance/admin/budget-requests/1"

# Create new request (invalidates cache)
curl -X POST "http://localhost:4005/api/operations/non-admin/budget-requests" \
  -H "Content-Type: application/json" \
  -d '{ "purpose": "Test", ... }'

# View list again (cache miss, refetched)
curl -X GET "http://localhost:4005/api/finance/admin/budget-requests?page=1&limit=10"
```

**Expected Logs:**
```
✅ Cache hit (Redis): budget:requests:detail:{"id":1}

🗑️ Invalidated 8 cache keys (Redis) matching: budget:requests:list:*
🗑️ Invalidated 5 cache keys (Redis) matching: budget:analytics:*

❌ Cache miss: budget:requests:list:{...}
💾 Cached (Redis): budget:requests:list:{...} [TTL: 180s]
```

---

## Best Practices

### ✅ DO:
1. Use `cache.withCache()` for READ operations
2. Invalidate affected caches after WRITE operations
3. Use user-aware keys for role-based data
4. Set appropriate TTLs based on data volatility
5. Monitor cache hit rates

### ❌ DON'T:
1. Cache write operations
2. Cache data without invalidation strategy
3. Use excessively long TTLs (>15 minutes for lists)
4. Forget to handle cache failures gracefully
5. Cache sensitive data without encryption

---

## Files Modified

| File | Changes |
|------|---------|
| `src/controllers/budgetRequest.controller.ts` | Added caching to list & detail endpoints, enhanced invalidation |
| `src/utils/cache.util.ts` | Already existed with complete implementation |

---

## Future Enhancements

1. **Cache Warming:** Pre-populate cache on startup
2. **Cache Metrics:** Track hit rates, latency improvements
3. **Smarter Invalidation:** Only invalidate affected pages/filters
4. **Cache Compression:** Reduce memory usage for large datasets
5. **Write-Through Cache:** Update cache on write instead of invalidate
