# API Testing Guide

## Quick Start

### 1. Enable JWT Testing Mode

For quick testing without external auth service, enable JWT bypass mode:

```env
# In .env file
JWT_DISABLED=true
```

**⚠️ WARNING**: Only use this in development! Never enable in production.

### 2. Get JWT Tokens from HR Auth Service

In production, JWT tokens are provided by the HR Auth Microservice. For development/testing without HR Auth:

**Option A: Use JWT Disabled Mode** (Recommended for quick testing)
- Set `JWT_DISABLED=true` in `.env`
- Use mock headers (see below)

**Option B: Get tokens from HR Auth Service**
- Contact HR Auth team for test tokens
- Or use HR Auth's login endpoint to get a token

### 3. Start the API Server

```powershell
npm run dev:api
```

The server will start on `http://localhost:4005`

---

## Testing with JWT Disabled

When `JWT_DISABLED=true`, you can test without tokens using mock headers:

### Mock Headers

```http
x-mock-role: SuperAdmin
x-mock-department: finance
```

### Example with curl:

```powershell
curl http://localhost:4005/api/budget-requests `
  -H "x-mock-role: SuperAdmin" `
  -H "x-mock-department: finance"
```

### Example with PowerShell:

```powershell
$headers = @{
    "x-mock-role" = "SuperAdmin"
    "x-mock-department" = "finance"
}

Invoke-RestMethod -Uri "http://localhost:4005/api/budget-requests" -Headers $headers
```

---

## Testing with JWT Tokens (from HR Auth)

### 1. Get a Token from HR Auth

Contact your HR Auth team or use their login endpoint to obtain a JWT token.

### 2. Use the Token in Requests

#### Using curl:

```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl http://localhost:4005/api/budget-requests `
  -H "Authorization: Bearer $token"
```

#### Using PowerShell:

```powershell
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:4005/api/budget-requests" -Headers $headers
```

#### Using Postman:

1. Open Postman
2. Create a new request
3. Go to **Authorization** tab
4. Select **Bearer Token**
5. Paste your generated token
6. Send request

---

## Available Endpoints

### Health Check

```http
GET /api/health
```

No authentication required.

### Budget Requests

#### List all budget requests

```http
GET /api/budget-requests
Headers:
  Authorization: Bearer <token>
  (or x-mock-role: SuperAdmin when JWT_DISABLED=true)
```

#### Get a specific budget request

```http
GET /api/budget-requests/:id
Headers:
  Authorization: Bearer <token>
```

#### Create a new budget request

```http
POST /api/budget-requests
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "department": "finance",
  "amountRequested": 50000,
  "purpose": "New office equipment",
  "justification": "Current equipment is outdated",
  "category": "operational",
  "priority": "medium"
}
```

#### Submit a budget request

```http
POST /api/budget-requests/:id/submit
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "comments": "Urgent approval needed"
}
```

#### Approve a budget request (SuperAdmin only)

```http
POST /api/budget-requests/:id/approve
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "approvedAmount": 50000,
  "comments": "Approved for Q1 budget",
  "reservationExpiry": "2025-03-31T23:59:59Z"
}
```

#### Reject a budget request (SuperAdmin only)

```http
POST /api/budget-requests/:id/reject
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json
Body:
{
  "comments": "Insufficient budget remaining"
}
```

### Analytics

#### Department Summary

```http
GET /api/analytics/department/summary
GET /api/analytics/department/:department/summary
Headers:
  Authorization: Bearer <token>
Query Params:
  ?fiscalYear=2025
  &fiscalPeriod=Q1
```

#### Spending Trends

```http
GET /api/analytics/spending-trends
Headers:
  Authorization: Bearer <token>
Query Params:
  ?department=finance
  &startDate=2025-01-01
  &endDate=2025-03-31
  &groupBy=month
```

#### Approval Metrics

```http
GET /api/analytics/approval-metrics
Headers:
  Authorization: Bearer <token>
Query Params:
  ?department=finance
  &startDate=2025-01-01
  &endDate=2025-03-31
```

#### Top Requesters

```http
GET /api/analytics/top-requesters
Headers:
  Authorization: Bearer <token>
Query Params:
  ?department=finance
  &limit=10
```

#### Category Breakdown

```http
GET /api/analytics/category-breakdown
Headers:
  Authorization: Bearer <token>
Query Params:
  ?department=finance
```

---

## PowerShell Test Script

Save as `test-api.ps1`:

```powershell
# Configuration
$baseUrl = "http://localhost:4005/api"
$jwtDisabled = $true  # Set to $false to use JWT tokens from HR Auth

# Get token from HR Auth (if JWT is enabled)
if (-not $jwtDisabled) {
    Write-Host "Using JWT token from HR Auth" -ForegroundColor Yellow
    # TODO: Get token from HR Auth login endpoint or from HR Auth team
    $token = "eyJ..."  # Paste your token from HR Auth here
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
} else {
    Write-Host "Using mock mode (JWT disabled)" -ForegroundColor Yellow
    $headers = @{
        "x-mock-role" = "SuperAdmin"
        "x-mock-department" = "finance"
        "Content-Type" = "application/json"
    }
}

# Test 1: Health Check
Write-Host "`n[TEST 1] Health Check" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Health check passed" -ForegroundColor Green
    $response | ConvertTo-Json
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: List Budget Requests
Write-Host "`n[TEST 2] List Budget Requests" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/budget-requests" -Headers $headers -Method Get
    Write-Host "✅ Listed budget requests" -ForegroundColor Green
    Write-Host "Total requests: $($response.data.requests.Count)" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to list budget requests: $_" -ForegroundColor Red
}

# Test 3: Create Budget Request
Write-Host "`n[TEST 3] Create Budget Request" -ForegroundColor Cyan
$newRequest = @{
    department = "finance"
    amountRequested = 50000
    purpose = "Test budget request"
    justification = "Testing API functionality"
    category = "operational"
    priority = "medium"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/budget-requests" -Headers $headers -Method Post -Body $newRequest
    Write-Host "✅ Created budget request" -ForegroundColor Green
    $requestId = $response.data.id
    Write-Host "Request ID: $requestId" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Failed to create budget request: $_" -ForegroundColor Red
}

# Test 4: Department Summary
Write-Host "`n[TEST 4] Get Department Summary" -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/analytics/department/summary" -Headers $headers -Method Get
    Write-Host "✅ Retrieved department summary" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 3
} catch {
    Write-Host "❌ Failed to get department summary: $_" -ForegroundColor Red
}

Write-Host "`n" -NoNewline
Write-Host "=".repeat(60) -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host "=".repeat(60) -ForegroundColor Green
```

Run with:

```powershell
.\test-api.ps1
```

---

## Troubleshooting

### Issue: "Missing or invalid authorization token"

**Solution**: 
- If testing mode: Set `JWT_DISABLED=true` in `.env` and restart server
- If production mode: Generate a valid JWT token

### Issue: "You do not have permission to access this resource"

**Solution**:
- Check your user role in the JWT token or mock headers
- SuperAdmin has access to all endpoints
- Admin has limited access
- User has minimal access

### Issue: Server returns 500 error

**Solution**:
- Check server console for detailed error messages
- Verify database connection in `.env`
- Check if Prisma migrations are applied: `npx prisma migrate dev`

### Issue: Redis connection errors

**Solution**:
- Redis is optional for basic functionality
- Install Redis (see REDIS_INSTALLATION.md) for caching
- Server will continue without caching if Redis is unavailable

---

## Next Steps

1. ✅ Test all endpoints with your generated tokens
2. ✅ Try different user roles (SuperAdmin, Admin, User)
3. ✅ Test error cases (invalid data, unauthorized access)
4. 📋 Install Redis for performance testing
5. 🔐 Disable JWT_DISABLED before going to production
6. 🔌 Configure external service URLs (Finance API, Audit API)

---

## Useful Commands

```powershell
# Generate tokens
npm run generate:token -- superAdmin
npm run generate:token -- financeAdmin
npm run generate:token -- financeUser

# Start API server
npm run dev:api

# Check database
npx prisma studio

# View logs
# Server logs are printed to console in dev mode
```

---

## External Service Configuration

When ready to integrate with external services, update these in `.env`:

```env
# Finance Main API
FINANCE_API_URL=http://your-finance-api-url
FINANCE_API_KEY=your-finance-api-key

# Audit Logs API
AUDIT_LOGS_API_URL=http://your-audit-logs-api-url
AUDIT_API_KEY=your-audit-api-key

# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
```
