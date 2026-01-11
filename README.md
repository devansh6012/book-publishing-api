# Book Publishing API

A minimal Book Publishing API with **config-driven audit trail**, RBAC authentication, and comprehensive Pino logging.

**Live Demo:** [http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com](http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com)

## - Key Features

- **Config-Driven Audit Trail**: Add new entities to tracking by updating a single config file
- **Role-Based Access Control**: Admin and reviewer roles with proper authorization
- **Comprehensive Logging**: Pino with requestId/userId on every log line
- **Cursor-Based Pagination**: Efficient, consistent pagination for large datasets
- **Soft Delete**: Maintains data integrity and audit history
- **Request Tracing**: AsyncLocalStorage for request context propagation

## - Database Choice

| Environment | Database | Why |
|-------------|----------|-----|
| **Local Development** | SQLite | Zero config, single file, fast setup |
| **Production (AWS)** | PostgreSQL | Scalable, reliable, industry standard |

### Why SQLite for Local Development?
1. **Zero Configuration**: Single file database, no Docker or external services needed
2. **Fast Setup**: `npm run setup` and you're ready
3. **Portable**: Database file can be easily backed up, shared, or reset
4. **Perfect for Demo**: Focus on application logic, not infrastructure

### Why PostgreSQL for Production?
1. **Scalability**: Handles concurrent connections efficiently
2. **Reliability**: ACID compliant with robust transaction support
3. **Industry Standard**: Widely used in production environments
4. **Easy Migration**: Prisma makes switching databases seamless

Switching between databases requires only changing `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"      # Local development
  # provider = "postgresql" # Production
  url = env("DATABASE_URL")
}
```

## - AWS Architecture
```
Client → Nginx → Node.js → PostgreSQL
```

**Tech Stack:** AWS EC2 (Ubuntu 24.04) • PostgreSQL • PM2 • Nginx

## - Project Structure
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
├── logs/                 # Log files (when LOG_DESTINATION=file)
└── package.json
```

## - Quick Start (Local Development)

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

### Environment Variables
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="super-secret-jwt-key"

# Server
PORT=3000
NODE_ENV="development"

# Logging (default: file)
LOG_LEVEL="info"
LOG_DESTINATION="file"
LOG_FILE_PATH="./logs/app.log"
```

## - Audit Trail Configuration

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

### What's Stored Per Audit Record
```typescript
{
  id: "uuid",                    // Unique audit ID
  timestamp: "2025-01-11T...",   // When the action occurred
  entity: "Book",                // Entity type
  entityId: "book-uuid",         // Affected record ID
  action: "update",              // create | update | delete | restore
  actorId: "user-uuid",          // Who performed the action
  requestId: "req-uuid",         // For tracing
  diff: {                        // Before/after state
    before: { title: "Old Title" },
    after: { title: "New Title" }
  },
  fieldsChanged: "title"         // Comma-separated changed fields
}
```

**No code changes required to add new entities!** The audit system automatically:
- Records create/update/delete/restore actions
- Computes diffs between before/after states
- Respects exclude/redact configuration
- Captures requestId for traceability

## - Logging Configuration

### Log Destinations

**Default: File** (logs stored locally)
```env
# File logging (DEFAULT)
LOG_DESTINATION="file"
LOG_FILE_PATH="./logs/app.log"

# Console (Development)
LOG_DESTINATION="console"

# Elasticsearch
LOG_DESTINATION="elastic"
ELASTIC_NODE="http://localhost:9200"
ELASTIC_INDEX="book-publishing-logs"

# Logtail
LOG_DESTINATION="logtail"
LOGTAIL_SOURCE_TOKEN="your-token"
```

### Log Format

Every log line includes requestId and userId:
```json
{
  "level": "info",
  "time": "2025-01-11T10:30:00.000Z",
  "msg": "GET /api/books 200 15ms",
  "requestId": "abc-123-def",
  "userId": "user-uuid",
  "route": "/api/books",
  "method": "GET",
  "status": 200,
  "durationMs": 15
}
```

## - Error Handling

Centralized error middleware returns consistent format with requestId for correlation:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "title is required",
    "details": [
      { "field": "title", "message": "Title is required" }
    ],
    "requestId": "abc-123-def"
  }
}
```

**Note:** Stack traces are not exposed in production for security.

## - Authentication

The API supports two authentication methods:

### 1. API Key (Simpler)
```bash
curl -H "X-API-Key: admin-api-key" http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books
```

### 2. JWT Token
```bash
# Login to get token
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'

# Use token
curl -H "Authorization: Bearer YOUR_TOKEN" http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books
```

### Test Credentials

| Role     | Email                  | Password    | API Key               |
|----------|------------------------|-------------|-----------------------|
| Admin    | admin@bookpub.com      | admin123    | admin-api-key   |
| Reviewer | reviewer@bookpub.com   | reviewer123 | reviewer-api-key|

## - API Documentation

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

### Response Formats

**List Books:** `GET /api/books?limit=10`
```json
{
  "items": [
    {
      "id": "uuid",
      "title": "Why This Code Works",
      "authors": "Ankit Verma",
      "publishedBy": "Penguin",
      "createdBy": { "id": "...", "name": "Admin" },
      "createdAt": "2025-01-11T...",
      "updatedAt": "2025-01-11T..."
    }
  ],
  "nextCursor": "eyJpZCI6...",
  "hasMore": true
}
```

**Create Book:** `POST /api/books` → `201 Created`
```json
{
  "id": "uuid",
  "title": "Why This Code Works",
  "authors": "Ankit Verma",
  "publishedBy": "Penguin",
  "createdById": "user-uuid",
  "createdAt": "2025-01-11T..."
}
```

**Delete Book:** `DELETE /api/books/:id`
```json
{
  "ok": true
}
```

## - cURL Examples

### Authentication
```bash
# Login and get JWT token
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'

# Get current user
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/auth/me \
  -H "X-API-Key: admin-api-key"
```

### Books CRUD
```bash
# List books
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: admin-api-key"

# List with pagination
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books?limit=2" \
  -H "X-API-Key: admin-api-key"

# Create a book
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean System Design","authors":"Robert Bhayia","publishedBy":"Prentice Hall"}'

# Get a book by ID
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key"

# Update a book
curl -X PATCH http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean System Design - 2nd Edition"}'

# Delete a book
curl -X DELETE http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key"

# Restore a deleted book (admin only)
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/{book-id}/restore \
  -H "X-API-Key: admin-api-key"
```

### Audit Trail (Admin Only)
```bash
# List all audits
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits \
  -H "X-API-Key: admin-api-key"

# Filter by entity
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?entity=Book" \
  -H "X-API-Key: admin-api-key"

# Filter by action
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?action=update" \
  -H "X-API-Key: admin-api-key"

# Filter by date range
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z" \
  -H "X-API-Key: admin-api-key"

# Filter by fields changed (returns records where ANY of these fields changed)
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?fieldsChanged=title,authors" \
  -H "X-API-Key: admin-api-key"

# Combined filters
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?entity=Book&action=update&fieldsChanged=title&limit=5" \
  -H "X-API-Key: admin-api-key"

# Get specific audit
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits/{audit-id} \
  -H "X-API-Key: admin-api-key"

# Get auditable entities list
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits/entities \
  -H "X-API-Key: admin-api-key"
```

### Access Control Demo
```bash
# Reviewer trying to access audits (403 Forbidden)
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits \
  -H "X-API-Key: reviewer-api-key"
# Response: {"error":{"code":"FORBIDDEN","message":"Access denied. Required roles: admin"}}

# Reviewer can access books
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: reviewer-api-key"
```

## - Typical Workflow Demo
```bash
# 1. Create a book
BOOK_ID=$(curl -s -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","authors":"Test Author","publishedBy":"Test Publisher"}' \
  | jq -r '.id')

echo "Created book: $BOOK_ID"

# 2. Update the book
curl -s -X PATCH http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/$BOOK_ID \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Test Book"}'

# 3. Delete the book
curl -s -X DELETE http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/$BOOK_ID \
  -H "X-API-Key: admin-api-key"

# 4. View audit trail for this book
curl -s "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?entityId=$BOOK_ID" \
  -H "X-API-Key: admin-api-key" | jq '.items[] | {action, fieldsChanged, timestamp}'

# 5. Restore the book
curl -s -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/$BOOK_ID/restore \
  -H "X-API-Key: admin-api-key"

# 6. View complete audit trail (create → update → delete → restore)
curl -s "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?entityId=$BOOK_ID" \
  -H "X-API-Key: admin-api-key" | jq '.items'
```

## - Architecture

### Clean Architecture Layers
```
Routes → Controllers → Services → Repositories
             ↓            ↓            ↓
         Validation    Business    Data Access
           (Zod)        Logic       (Prisma)
```

### Key Design Decisions

1. **Soft Delete**: Books are never permanently deleted
   - Maintains referential integrity
   - Preserves audit history
   - Allows data recovery
   - Shows complete lifecycle in audits

2. **Cursor Pagination**: More efficient than offset-based
   - O(1) performance regardless of offset
   - Consistent results during pagination
   - Uses indexed columns

3. **AsyncLocalStorage**: Request context propagation
   - No need to pass requestId/userId through every function
   - Automatic inclusion in all logs
   - Clean separation of concerns

4. **Config-Driven Audit**: Extensibility without code changes
   - Single source of truth for auditable entities
   - Field exclusion and redaction
   - Easy to add new entities

## - Scripts
```bash
npm run dev       # Development server with hot reload
npm run build     # Build for production
npm run start     # Start production server
npm run setup     # Setup database and seed data
npm run db:studio # Open Prisma Studio
```

## - License

MIT