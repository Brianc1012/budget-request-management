# API Integration Guide

## Overview
This document describes the complete API integration implementation for the Budget Management system, including JWT token validation with role-based access control.

## Architecture

### Backend (Already Implemented)
The backend has a complete JWT authentication and authorization system with the following features:

#### JWT Middleware (`src/middlewares/auth.middleware.ts`)
- Checks `JWT_DISABLED` environment variable
- **When JWT_DISABLED=true**: Creates mock user from headers (`x-mock-role`, `x-mock-department`)
- **When JWT_DISABLED=false**: Validates JWT token, verifies signature, checks expiration

#### Permission Middleware (`src/middlewares/permission.middleware.ts`)
- Validates action scope: `'own'` | `'department'` | `'all'`
- **Finance Admin**: Full access to all departments
- **Department Admin**: Access to own department only
- **Department Staff**: Access to own requests only

#### Route Structure (Department-Based)
```
/finance/admin/budget-requests         - Finance Admin (all departments)
/{department}/admin/budget-requests    - Department Admin (department scope)
/{department}/non-admin/budget-requests - Department Staff (own requests)
```

### Frontend (Newly Implemented)

#### Service Layer Architecture

**1. Base API Service** (`app/services/api.service.ts`)
```typescript
class ApiService {
  private token: string | null = null;
  private mockRole: string | null = null;
  private mockDepartment: string | null = null;

  // Token Management
  setToken(token: string)
  setMockRole(role: string, department: string)
  clearAuth()
  
  // Request Methods
  get<T>(endpoint, params)
  post<T>(endpoint, body)
  put<T>(endpoint, body)
  delete<T>(endpoint)
}
```

**2. Budget Request Service** (`app/services/budgetRequest.service.ts`)
```typescript
class BudgetRequestService {
  // Smart endpoint routing based on role
  private getBaseEndpoint(): string {
    const role = apiService.getMockRole();
    const department = apiService.getMockDepartment();
    
    if (department === 'finance' && role.includes('admin'))
      return '/finance/admin/budget-requests';
    if (role.includes('admin'))
      return `/${department}/admin/budget-requests`;
    return `/${department}/non-admin/budget-requests`;
  }

  // CRUD Operations
  async list(params?: ListParams)
  async getById(id: number)
  async create(data: CreateBudgetRequestDto)
  async update(id: number, data: UpdateBudgetRequestDto)
  async delete(id: number)
  async submit(id: number)
  async approve(id: number, approvalData?: ApprovalDto)
  async reject(id: number, rejectionData: RejectionDto)
}
```

**3. Authentication Context** (`app/contexts/AuthContext.tsx`)
```typescript
interface User {
  id: string;
  username: string;
  role: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  setMockUser: (role: string, department: string) => void;
}
```

**4. Mock Auth Selector** (`app/Components/MockAuthSelector.tsx`)
- Floating badge with current role display
- Dropdown with 8 predefined roles for testing
- Automatically updates auth context and API headers

## Configuration

### Backend Environment Variables
```env
# .env (ftms_backend)
JWT_DISABLED=true  # Set to false for production
JWT_SECRET=your-secret-key-here
```

### Frontend Environment Variables
```env
# .env.local (budget)
NEXT_PUBLIC_API_URL=http://localhost:4005/api
NEXT_PUBLIC_ENABLE_MOCK_AUTH=true
```

## Role-Based Access Matrix

| Role | Department | Access Scope | Available Endpoints |
|------|------------|--------------|---------------------|
| Finance Admin | finance | All departments | `/finance/admin/*` |
| Finance Staff | finance | Own requests | `/finance/non-admin/*` |
| HR Admin | hr | HR department | `/hr/admin/*` |
| HR Staff | hr | Own requests | `/hr/non-admin/*` |
| Inventory Admin | inventory | Inventory dept | `/inventory/admin/*` |
| Inventory Staff | inventory | Own requests | `/inventory/non-admin/*` |
| Operations Admin | operations | Operations dept | `/operations/admin/*` |
| Operations Staff | operations | Own requests | `/operations/non-admin/*` |

## Testing Guide

### 1. Development Mode (JWT_DISABLED=true)

**Setup:**
1. Set `JWT_DISABLED=true` in backend `.env`
2. Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` in frontend `.env.local`
3. Start both backend and frontend

**Testing:**
1. Open the Budget Management page
2. Click the floating role badge (top-left corner)
3. Select a role from the dropdown
4. Test operations based on role:
   - **Finance Admin**: Can view all, approve, reject
   - **Department Admin**: Can view department requests, submit
   - **Staff**: Can view only own requests, create, submit

**What Happens:**
- Frontend sends `x-mock-role` and `x-mock-department` headers
- Backend creates mock user context from these headers
- No JWT token required

### 2. Production Mode (JWT_DISABLED=false)

**Setup:**
1. Set `JWT_DISABLED=false` in backend `.env`
2. Obtain JWT token from authentication service
3. Call `apiService.setToken(token)` after login

**Testing:**
1. Login to get JWT token
2. Token automatically sent in `Authorization: Bearer <token>` header
3. Backend validates token signature and expiration
4. User context extracted from token payload

**What Happens:**
- Frontend sends `Authorization: Bearer <token>` header
- Backend verifies JWT signature
- Backend checks token expiration
- User context extracted from token payload

## API Integration Pattern

### Page Component Integration
```typescript
// Import services
import budgetRequestService from '../../../services/budgetRequest.service';
import { useAuth } from '../../../contexts/AuthContext';

const BudgetRequestPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<BudgetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await budgetRequestService.list({
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter || undefined
        });
        
        if (response.success && response.data) {
          setData(response.data);
        } else {
          showError(response.error || 'Failed to load data');
        }
      } catch (error: any) {
        showError(error.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentPage, pageSize, search, statusFilter]);

  // Create request
  const handleCreate = async (newRequest: any) => {
    setLoading(true);
    try {
      const response = await budgetRequestService.create({
        purpose: newRequest.purpose,
        justification: newRequest.justification,
        amountRequested: newRequest.amountRequested,
        category: newRequest.category,
        fiscalYear: newRequest.fiscalYear,
        fiscalPeriod: newRequest.fiscalPeriod,
        department: user?.department || 'operations',
        createdByName: user?.username || 'Unknown',
        createdByRole: user?.role || 'Staff',
        status: 'DRAFT'
      });
      
      if (response.success) {
        showSuccess('Request created successfully');
        // Refresh list
      } else {
        showError(response.error);
      }
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };
};
```

## Error Handling

### Frontend Error Responses
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Common Error Scenarios

**1. Unauthorized (401)**
- Token missing or invalid
- Token expired
- Mock headers missing (when JWT_DISABLED=true)

**2. Forbidden (403)**
- User lacks permission for operation
- Department mismatch
- Ownership violation

**3. Not Found (404)**
- Request ID doesn't exist
- Endpoint not found

**4. Validation Error (400)**
- Missing required fields
- Invalid data format
- Business rule violation

## Security Considerations

### Development (JWT_DISABLED=true)
✅ **Pros:**
- Easy role switching for testing
- No token management complexity
- Fast development iteration

⚠️ **Cons:**
- Anyone can impersonate any role
- Should NEVER be used in production
- No actual authentication

### Production (JWT_DISABLED=false)
✅ **Pros:**
- Secure authentication
- Token verification
- Expiration handling
- Cannot impersonate users

⚠️ **Cons:**
- Requires token management
- Need refresh token logic
- More complex error handling

## Common Issues & Solutions

### Issue 1: 401 Unauthorized Error
**Problem:** Backend returns 401 when making API calls

**Solution:**
- **Dev Mode**: Ensure mock auth selector is used to set role
- **Prod Mode**: Ensure JWT token is set via `apiService.setToken()`
- Check that `JWT_DISABLED` matches your setup

### Issue 2: 403 Forbidden Error
**Problem:** User cannot access certain operations

**Solution:**
- Verify user role matches required permission
- Check department matches (for non-Finance Admin)
- Ensure Finance Admin role for approve/reject operations

### Issue 3: Endpoint Routing Issues
**Problem:** Wrong endpoint being called

**Solution:**
- Check `getBaseEndpoint()` logic in budgetRequestService
- Verify role name matches exactly (case-sensitive)
- Department name must match backend routes

### Issue 4: Mock Auth Not Working
**Problem:** Role selection not working

**Solution:**
- Ensure `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true`
- Check that AuthProvider wraps entire app
- Verify MockAuthSelector is rendered

## Files Modified

### Frontend Files Created/Updated
1. ✅ `app/services/api.service.ts` - Base API client (NEW)
2. ✅ `app/services/budgetRequest.service.ts` - Budget request service (NEW)
3. ✅ `app/contexts/AuthContext.tsx` - Authentication context (NEW)
4. ✅ `app/Components/MockAuthSelector.tsx` - Role selector UI (NEW)
5. ✅ `app/styles/budget-management/mockAuthSelector.css` - Styles (NEW)
6. ✅ `app/layout.tsx` - Added AuthProvider and MockAuthSelector (UPDATED)
7. ✅ `app/(pages)/budget-management/budgetRequest/page.tsx` - API integration (UPDATED)
8. ✅ `.env.local` - Environment configuration (NEW)

### Backend Files (Already Complete)
- ✅ `src/middlewares/auth.middleware.ts` - JWT validation with JWT_DISABLED
- ✅ `src/middlewares/permission.middleware.ts` - Role-based permissions
- ✅ `src/routes/finance/admin/budgetRequest.routes.ts` - Finance Admin routes
- ✅ `src/routes/{dept}/admin/budgetRequest.routes.ts` - Department Admin routes
- ✅ `src/routes/{dept}/nonAdmin/budgetRequest.routes.ts` - Staff routes

## Next Steps

### Immediate Tasks
1. ✅ Test with different roles using MockAuthSelector
2. ⏳ Update `addBudgetRequest.tsx` to use API service
3. ⏳ Update `viewBudgetRequest.tsx` to refresh data after actions
4. ⏳ Test JWT_DISABLED=false mode with real tokens

### Future Enhancements
- Add refresh token logic
- Add token expiration handling
- Add offline mode support
- Add request retry logic
- Add response caching

## Support

For issues or questions:
1. Check this guide first
2. Review console logs for error messages
3. Verify environment variables
4. Check network tab for request/response details
