# Budget Request Microservice - Backend API

A comprehensive backend microservice for managing budget requests with approval workflows, multi-item allocations, and real-time notifications.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Redis 7+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run prisma:migrate

# Generate Prisma Client
npm run prisma:generate

# Seed database (optional)
npm run prisma:seed
```

### Development

```bash
# Start API server in development mode
npm run dev:api

# Start Next.js frontend
npm run dev

# Open Prisma Studio
npm run prisma:studio
```

The API will be available at `http://localhost:4005/api`

### Production Build

```bash
# Build API
npm run build:api

# Start API server
npm run start:api
```

## 📚 API Documentation

### Base URL
```
http://localhost:4005/api
```

### Authentication
All endpoints (except `/health`) require JWT authentication:
```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Health Check
```http
GET /api/health
```
No authentication required. Returns service health status.

#### List Budget Requests
```http
GET /api/budget-requests?page=1&limit=20&status=PENDING&department=finance
```
Query Parameters:
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (PENDING, APPROVED, REJECTED)
- `department` (string): Filter by department
- `dateFrom` (string): Start date (YYYY-MM-DD)
- `dateTo` (string): End date (YYYY-MM-DD)
- `priority` (string): Filter by priority

#### Get Budget Request
```http
GET /api/budget-requests/:id
```

#### Create Budget Request
```http
POST /api/budget-requests
Content-Type: application/json

{
  "department": "finance",
  "amountRequested": 50000,
  "purpose": "Office equipment upgrade",
  "justification": "Detailed justification",
  "category": "capital",
  "priority": "high",
  "items": [
    {
      "itemName": "Laptop Dell XPS 15",
      "quantity": 10,
      "unitCost": 45000,
      "totalCost": 450000,
      "supplierId": "SUP-001",
      "supplierName": "Tech Solutions Inc.",
      "itemPriority": "must_have",
      "isEssential": true
    }
  ]
}
```

#### Submit Budget Request
```http
POST /api/budget-requests/:id/submit
```
Changes status from draft to submitted for approval.

#### Approve Budget Request (Admin Only)
```http
POST /api/budget-requests/:id/approve
Content-Type: application/json

{
  "reviewNotes": "Approved for Q4 budget allocation",
  "reservedAmount": 50000,
  "bufferPercentage": 5
}
```

#### Reject Budget Request (Admin Only)
```http
POST /api/budget-requests/:id/reject
Content-Type: application/json

{
  "reviewNotes": "Insufficient justification provided"
}
```

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Authentication**: JWT
- **Validation**: Joi
- **Email**: Nodemailer

### Project Structure
```
src/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middlewares/     # Express middlewares
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Helper functions
├── types/           # TypeScript types
├── webhooks/        # Webhook system
└── index.ts         # Entry point
```

### Key Features
- ✅ JWT Authentication & Role-Based Access Control
- ✅ Multi-item Budget Request Support
- ✅ Approval Workflow with History Tracking
- ✅ Real-time Webhook Notifications
- ✅ Redis Caching for Performance
- ✅ Integration with Finance & Audit Systems
- ✅ Email Notifications
- ✅ Rate Limiting & Security
- ✅ Comprehensive Error Handling

## 🔐 Security

- JWT token validation
- Role-based access control
- Input validation with Joi
- Rate limiting
- CORS configuration
- SQL injection prevention (Prisma ORM)
- XSS prevention (sanitization)

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test
```

## 📝 Environment Variables

See `.env.example` for all required environment variables.

Critical variables:
- `BUDGET_REQUEST_DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Secret key for JWT signing (min 32 characters)
- `REDIS_HOST`: Redis server host
- `FINANCE_API_URL`: Finance microservice URL
- `AUDIT_LOGS_API_URL`: Audit logs microservice URL

## 🚢 Deployment

### Docker
```bash
docker build -t budget-request-api .
docker run -p 4005:4005 budget-request-api
```

### Docker Compose
```bash
docker-compose up -d
```

## 📊 Monitoring

- Health check endpoint: `/api/health`
- Request logging middleware
- Error tracking
- Cache hit rate monitoring

## 🔄 Integration

### Finance Main System
- Syncs department budget data every 15 minutes
- Notifies of budget reservations
- Validates budget availability

### Audit Logs
- Logs all CRUD operations
- Tracks approval/rejection actions
- Records user actions

### Webhooks
Event types:
- `budget_request.created`
- `budget_request.submitted`
- `budget_request.approved`
- `budget_request.rejected`
- `budget_request.cancelled`

## 📖 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Guide](https://expressjs.com/)
- [Redis Documentation](https://redis.io/docs/)

## 👥 Team

Budget Request Management System - Capstone Project 2025

## 📄 License

Private - All Rights Reserved
