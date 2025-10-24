# Bug Fix: "undefined" String in Query Parameters

## Issue Description

**Error Message:**
```
Invalid value for argument `status`. Expected BudgetRequestStatus.
Received: "undefined"
```

**Root Cause:**
The frontend was sending optional query parameters with the string value `"undefined"` instead of omitting them entirely. When these parameters reached the backend, they were being passed directly to Prisma queries, causing validation errors.

## Example of the Problem

### Before Fix - Frontend Code:
```typescript
const response = await budgetRequestService.list({
  page: currentPage,
  limit: pageSize,
  search: search || undefined,  // ❌ Becomes string "undefined" in URL
  status: statusFilter || undefined,  // ❌ Becomes string "undefined" in URL
  sortBy: sortField,
  sortOrder: sortOrder
});
```

**Resulting URL:**
```
/api/finance/admin/budget-requests?page=1&limit=10&search=undefined&status=undefined&sortBy=createdAt&sortOrder=desc
```

### Before Fix - Backend Code:
```typescript
// Applied filter directly without validation
if (status) filter.status = status;  // ❌ status = "undefined" string
```

## Solutions Implemented

### Fix 1: Frontend - Only Send Defined Values

**File:** `app/(pages)/budget-management/budgetRequest/page.tsx`

```typescript
// Build params object, only include defined values
const params: any = {
  page: currentPage,
  limit: pageSize,
  sortBy: sortField,
  sortOrder: sortOrder
};

// Only add optional params if they have values
if (search) params.search = search;
if (statusFilter) params.status = statusFilter;

const response = await budgetRequestService.list(params);
```

**Result:**
- Only sends parameters that have actual values
- Empty/undefined parameters are omitted from the request
- URL becomes cleaner: `/api/finance/admin/budget-requests?page=1&limit=10&sortBy=createdAt&sortOrder=desc`

### Fix 2: Backend - Validate Query Parameters

**File:** `src/controllers/budgetRequest.controller.ts`

```typescript
// Helper function to check if value is valid
const isValidValue = (value: any): boolean => {
  return value !== undefined && 
         value !== null && 
         value !== '' && 
         value !== 'undefined' &&  // ✅ Filters out string "undefined"
         value !== 'null';          // ✅ Filters out string "null"
};

// Apply filters - only if values are valid
if (isValidValue(status)) filter.status = status;
if (isValidValue(department)) filter.department = department;
if (isValidValue(priority)) filter.priority = priority;

// Apply search filter
if (isValidValue(search)) {
  filter.OR = [
    { purpose: { contains: search as string, mode: 'insensitive' } },
    { justification: { contains: search as string, mode: 'insensitive' } },
    { requestCode: { contains: search as string, mode: 'insensitive' } }
  ];
}
```

**Benefits:**
- Defense-in-depth approach: validates on backend even if frontend sends bad data
- Handles edge cases: `null`, `"null"`, `"undefined"`, empty strings
- Added search functionality across multiple fields
- Makes API more robust against invalid inputs

## Testing

### Test Case 1: No Filters
**Request:**
```
GET /api/finance/admin/budget-requests?page=1&limit=10&sortBy=createdAt&sortOrder=desc
```

**Expected Result:**
- ✅ Returns all budget requests
- ✅ No Prisma validation errors
- ✅ Pagination works correctly

### Test Case 2: With Status Filter
**Request:**
```
GET /api/finance/admin/budget-requests?page=1&limit=10&status=APPROVED
```

**Expected Result:**
- ✅ Returns only APPROVED requests
- ✅ Status filter applied correctly

### Test Case 3: With Search
**Request:**
```
GET /api/finance/admin/budget-requests?page=1&limit=10&search=maintenance
```

**Expected Result:**
- ✅ Searches across purpose, justification, and requestCode
- ✅ Case-insensitive search
- ✅ Returns matching results

## Common Query Parameter Issues

### Issue 1: TypeScript undefined vs String "undefined"
```typescript
// ❌ Bad - undefined becomes "undefined" in URL
const url = `/api/endpoint?param=${param || undefined}`;

// ✅ Good - Build query string conditionally
const params = new URLSearchParams();
if (param) params.append('param', param);
const url = `/api/endpoint?${params.toString()}`;
```

### Issue 2: Empty String vs Null vs Undefined
```typescript
// All these should be treated as "no value"
const isValidValue = (value: any): boolean => {
  return value !== undefined && 
         value !== null && 
         value !== '' && 
         value !== 'undefined' && 
         value !== 'null';
};
```

### Issue 3: Boolean Query Parameters
```typescript
// ❌ Bad - "false" string is truthy
if (enabled) filter.enabled = enabled;  // enabled = "false" is truthy!

// ✅ Good - Parse boolean strings
if (isValidValue(enabled)) {
  filter.enabled = enabled === 'true' || enabled === true;
}
```

## Prevention Tips

### Frontend Best Practices
1. **Build query params conditionally:**
   ```typescript
   const params: any = {};
   if (value) params.key = value;
   ```

2. **Use URLSearchParams properly:**
   ```typescript
   const searchParams = new URLSearchParams();
   if (status) searchParams.append('status', status);
   ```

3. **Avoid string concatenation:**
   ```typescript
   // ❌ Bad
   const url = `/api?status=${status}`;
   
   // ✅ Good
   const params = { ...(status && { status }) };
   apiService.get('/api', params);
   ```

### Backend Best Practices
1. **Always validate query parameters:**
   ```typescript
   const isValidValue = (value: any) => {
     return value && value !== 'undefined' && value !== 'null';
   };
   ```

2. **Use TypeScript discriminated unions:**
   ```typescript
   type QueryParams = {
     status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
   };
   ```

3. **Sanitize inputs before Prisma:**
   ```typescript
   const filter: any = {};
   if (isValidValue(status)) {
     filter.status = status as BudgetRequestStatus;
   }
   ```

## Files Modified

- ✅ `app/(pages)/budget-management/budgetRequest/page.tsx` - Fixed query parameter building
- ✅ `src/controllers/budgetRequest.controller.ts` - Added parameter validation and search functionality

## Related Issues

This fix also resolves:
- Invalid date format errors
- Null/undefined confusion
- Empty string filters
- Case sensitivity in search

## Verification

After applying these fixes, verify:
1. ✅ Page loads without Prisma errors
2. ✅ Filters work correctly when applied
3. ✅ Search functionality works
4. ✅ Empty filters don't cause errors
5. ✅ URL parameters are clean and readable
