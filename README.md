# Book Publishing API

A minimal Book Publishing API with **config-driven audit trail**, RBAC authentication, and comprehensive Pino logging.

🔗 **Live Demo:** [https://book-publishing-api.onrender.com](https://book-publishing-api.onrender.com)

## 🎯 Key Features

- **Config-Driven Audit Trail**: Add new entities to tracking by updating a single config file
- **Role-Based Access Control**: Admin and reviewer roles with proper authorization
- **Comprehensive Logging**: Pino with requestId/userId on every log line
- **Cursor-Based Pagination**: Efficient, consistent pagination for large datasets
- **Soft Delete**: Maintains data integrity and audit history
- **Request Tracing**: AsyncLocalStorage for request context propagation

## 🗄️ Database Choice

| Environment | Database | Why |
|-------------|----------|-----|
| **Local Development** | SQLite | Zero config, single file, fast setup |
| **Production** | PostgreSQL | Scalable, reliable, industry standard |

Switching between databases requires only changing `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"      # Local development
  # provider = "postgresql" # Production
  url = env("DATABASE_URL")
}
```

## 📁 Project Structure
```
book-publishing-api/
├── src/
│   ├── config/           # Configuration (audit, logger)
│   ├── controllers/      # HTTP request handlers
│   ├── middleware/       # Auth, error handling, logging
│   ├── repositories/     # Data access layer
│   ├── routes/           # Express routes
│   ├── services/         # Business logic
│   ├── types/            # TypeScript types
│   ├── utils/            # Utilities (logger, pagination, diff)
│   ├── validation/       # Zod schemas
│   └── app.ts            # Application entry point
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data
├── logs/                 # Log files (created automatically)
└── package.json
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js >= 18
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/devansh6012/book-publishing-api.git
cd book-publishing-api

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Setup database and seed data
npm run setup

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000`.

### Environment Variables (Local)
```env
# Database (SQLite for local)
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="super-secret-jwt-key"
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
NODE_ENV="development"

# Logging
LOG_LEVEL="info"
LOG_DESTINATION="console"
LOG_FILE_PATH="./logs/app.log"
```

## ☁️ Production Deployment (Render)

The API is deployed on [Render](https://render.com) with PostgreSQL.

### Deployment Steps

1. **Create PostgreSQL Database** on Render (Free tier)
2. **Create Web Service** connected to this GitHub repo
3. **Set Build Command:** `npm install && npm run build && npx prisma db push`
4. **Set Start Command:** `npm start`
5. **Add Environment Variables:**

| Key | Value |
|-----|-------|
| `DATABASE_URL` | PostgreSQL Internal URL from Render |
| `JWT_SECRET` | Your secret key |
| `NODE_ENV` | `production` |
| `LOG_DESTINATION` | `console` |
| `LOG_LEVEL` | `info` |

### Production Environment Variables
```env
DATABASE_URL="postgres://user:password@host:5432/dbname"
JWT_SECRET="your-production-secret-key"
NODE_ENV="production"
LOG_DESTINATION="console"
LOG_LEVEL="info"
```

## 📝 Audit Trail Configuration

The audit trail is **config-driven**. To add a new entity, simply update `src/config/audit.config.ts`:
```typescript
export const auditConfig: AuditConfig = {
  Book: {
    track: true,
    exclude: ['updatedAt'],    // Fields to exclude from diff
    redact: [],                // Fields to show as [REDACTED]
  },
  User: {
    track: true,
    exclude: ['updatedAt'],
    redact: ['password', 'apiKey'],  // Sensitive fields
  },
  // Add new entities here - no other code changes needed!
  Publisher: {
    track: true,
    exclude: ['updatedAt'],
    redact: ['taxId'],
  },
};
```

**No other code changes required!** The audit system automatically:
- Records create/update/delete/restore actions
- Computes diffs between before/after states
- Respects exclude/redact configuration
- Captures requestId for traceability

## 📋 Logging Configuration

### Switching Log Destinations
```env
# Console (Development)
LOG_DESTINATION="console"

# File
LOG_DESTINATION="file"
LOG_FILE_PATH="./logs/app.log"

# Elasticsearch
LOG_DESTINATION="elastic"
ELASTIC_NODE="http://localhost:9200"
ELASTIC_INDEX="book-publishing-logs"

# Logtail
LOG_DESTINATION="logtail"
LOGTAIL_SOURCE_TOKEN="your-token"
```

### Log Format

Every log line includes:
```json
{
  "level": "info",
  "time": "2025-12-31T10:30:00.000Z",
  "msg": "GET /api/books 200 15ms",
  "requestId": "abc-123-def",
  "userId": "user-uuid",
  "route": "/api/books",
  "method": "GET",
  "status": 200,
  "durationMs": 15
}
```

## 🔐 Authentication

The API supports two authentication methods:

### 1. API Key
```bash
curl -H "X-API-Key: admin-api-key-12345" https://book-publishing-api.onrender.com/api/books
```

### 2. JWT Token
```bash
# Login to get token
curl -X POST https://book-publishing-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" https://book-publishing-api.onrender.com/api/books
```

### Test Credentials

| Role     | Email                  | Password    | API Key               |
|----------|------------------------|-------------|-----------------------|
| Admin    | admin@bookpub.com      | admin123    | admin-api-key-12345   |
| Reviewer | reviewer@bookpub.com   | reviewer123 | reviewer-api-key-67890|

## 📖 API Documentation

### Books

| Method | Endpoint              | Description           | Auth        |
|--------|-----------------------|-----------------------|-------------|
| GET    | /api/books            | List books (paginated)| Required    |
| POST   | /api/books            | Create a book         | Required    |
| GET    | /api/books/:id        | Get a book            | Required    |
| PATCH  | /api/books/:id        | Update a book         | Required    |
| DELETE | /api/books/:id        | Soft delete a book    | Required    |
| POST   | /api/books/:id/restore| Restore deleted book  | Admin only  |

### Audits (Admin Only)

| Method | Endpoint            | Description            |
|--------|---------------------|------------------------|
| GET    | /api/audits         | List audits (filtered) |
| GET    | /api/audits/:id     | Get single audit       |
| GET    | /api/audits/entities| List auditable entities|

### Audit Filters

All filters are optional and combinable:
- `from`, `to`: ISO datetime range
- `entity`: Entity name (e.g., Book, User)
- `entityId`: Specific entity ID
- `actorId`: Who made the change
- `action`: create|update|delete|restore|login
- `fieldsChanged`: Comma-separated field names
- `requestId`: Trace specific request
- `limit`, `cursor`: Pagination

## 🧪 cURL Examples

> **Note:** Replace `localhost:3000` with `book-publishing-api.onrender.com` for production.

### Authentication
```bash
# Login and get JWT token
curl -X POST https://book-publishing-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'

# Get current user
curl https://book-publishing-api.onrender.com/api/auth/me \
  -H "X-API-Key: admin-api-key-12345"
```

### Books CRUD
```bash
# List books
curl https://book-publishing-api.onrender.com/api/books \
  -H "X-API-Key: admin-api-key-12345"

# Create a book
curl -X POST https://book-publishing-api.onrender.com/api/books \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Architecture",
    "authors": "Robert C. Martin",
    "publishedBy": "Prentice Hall"
  }'

# Update a book
curl -X PATCH https://book-publishing-api.onrender.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Architecture - 2nd Edition"}'

# Delete a book
curl -X DELETE https://book-publishing-api.onrender.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key-12345"

# Restore a deleted book (admin only)
curl -X POST https://book-publishing-api.onrender.com/api/books/{book-id}/restore \
  -H "X-API-Key: admin-api-key-12345"
```

### Audit Trail (Admin Only)
```bash
# List all audits
curl https://book-publishing-api.onrender.com/api/audits \
  -H "X-API-Key: admin-api-key-12345"

# Filter by entity
curl "https://book-publishing-api.onrender.com/api/audits?entity=Book" \
  -H "X-API-Key: admin-api-key-12345"

# Filter by action
curl "https://book-publishing-api.onrender.com/api/audits?action=update" \
  -H "X-API-Key: admin-api-key-12345"

# Combined filters
curl "https://book-publishing-api.onrender.com/api/audits?entity=Book&action=update&limit=5" \
  -H "X-API-Key: admin-api-key-12345"
```

### Access Control Demo
```bash
# Reviewer trying to access audits (should fail with 403)
curl https://book-publishing-api.onrender.com/api/audits \
  -H "X-API-Key: reviewer-api-key-67890"
# Response: {"error":{"code":"FORBIDDEN","message":"Access denied..."}}

# Reviewer can access books
curl https://book-publishing-api.onrender.com/api/books \
  -H "X-API-Key: reviewer-api-key-67890"
```

## 🏗️ Architecture

### Clean Architecture Layers
```
Routes → Controllers → Services → Repositories
           ↓              ↓           ↓
    Validation      Business      Data Access
                     Logic
```

### Key Design Decisions

1. **Soft Delete**: Books are never permanently deleted
   - Maintains referential integrity
   - Preserves audit history
   - Allows data recovery

2. **Cursor Pagination**: More efficient than offset-based
   - O(1) performance regardless of offset
   - Consistent results during pagination

3. **AsyncLocalStorage**: Request context propagation
   - Automatic requestId/userId in all logs
   - Clean separation of concerns

4. **Config-Driven Audit**: Extensibility without code changes
   - Single source of truth for auditable entities
   - Field exclusion and redaction

## 📜 Scripts
```bash
npm run dev       # Start development server with hot reload
npm run build     # Build for production
npm run start     # Start production server
npm run setup     # Setup database and seed data (local only)
npm run db:studio # Open Prisma Studio (database UI)
```

## 📄 License

MIT