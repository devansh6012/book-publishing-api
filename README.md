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

## - AWS Architecture
```
Client → Nginx → Node.js → PostgreSQL
```

**Tech Stack:** AWS EC2 (Ubuntu 22.04) • PostgreSQL • PM2 • Nginx

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

### API Key
```bash
curl -H "X-API-Key: admin-api-key" http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books
```

### JWT Token
```bash
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'
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

### Books CRUD
```bash
# List books
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: admin-api-key"

# Create a book
curl -X POST http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean System Design","authors":"Robert Bhayia","publishedBy":"Prentice Hall"}'

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

# Filter by entity and action
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?entity=Book&action=update" \
  -H "X-API-Key: admin-api-key"

# Filter by date range
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z" \
  -H "X-API-Key: admin-api-key"

# Filter by fields changed
curl "http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits?fieldsChanged=title,authors" \
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

## - Architecture

### Clean Architecture Layers
```
Routes → Controllers → Services → Repositories
             ↓            ↓            ↓
         Validation    Business    Data Access
           (Zod)        Logic       (Prisma)
```

### Key Design Decisions

1. **Soft Delete**: Maintains referential integrity, preserves audit history, allows recovery

2. **Cursor Pagination**: O(1) performance regardless of offset, consistent results during data changes

3. **AsyncLocalStorage**: Automatic requestId/userId propagation across the entire request lifecycle without passing through every function

4. **Config-Driven Audit**: Add new entities by updating config only - no invasive code changes

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