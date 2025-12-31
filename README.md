# Book Publishing API

A minimal Book Publishing API with **config-driven audit trail**, RBAC authentication, and comprehensive Pino logging.

## - Key Features

- **Config-Driven Audit Trail**: Add new entities to tracking by updating a single config file
- **Role-Based Access Control**: Admin and reviewer roles with proper authorization
- **Comprehensive Logging**: Pino with requestId/userId on every log line
- **Cursor-Based Pagination**: Efficient, consistent pagination for large datasets
- **Soft Delete**: Maintains data integrity and audit history
- **Request Tracing**: AsyncLocalStorage for request context propagation

## - Database Choice: SQLite + Prisma

**Why SQLite?**
1. **Zero Configuration**: Single file database, no Docker or external services needed
2. **Fast Setup**: `npm run setup` and you're ready
3. **Portable**: Database file can be easily backed up, shared, or reset
4. **Perfect for Demo**: Focus on application logic, not infrastructure
5. **Production Path**: Easily switch to PostgreSQL/MySQL by changing Prisma datasource

For production, simply update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

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
├── logs/                 # Log files (created automatically)
└── package.json
```

## - Quick Start

### Prerequisites
- Node.js >= 20
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
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
NODE_ENV="development"

# Logging
LOG_LEVEL="info"
LOG_DESTINATION="file"    # Options: file, elastic, logtail, console
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
  // Add new entities here:
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

## - Logging Configuration

### Switching Log Destinations

**File Logging (Default)**
```env
LOG_DESTINATION="file"
LOG_FILE_PATH="./logs/app.log"
```

**Console (Pretty Print for Development)**
```env
LOG_DESTINATION="console"
```

**Elasticsearch**
```env
LOG_DESTINATION="elastic"
ELASTIC_NODE="http://localhost:9200"
ELASTIC_INDEX="book-publishing-logs"
```

**Logtail**
```env
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

## - Authentication

The API supports two authentication methods:

### 1. API Key (Simpler)
```bash
curl -H "X-API-Key: admin-api-key-12345" http://localhost:3000/api/books
```

### 2. JWT Token
```bash
# Login to get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}' | jq -r '.token')

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/books
```

### Test Credentials

| Role     | Email                  | Password    | API Key               |
|----------|------------------------|-------------|-----------------------|
| Admin    | admin@bookpub.com      | admin123    | admin-api-key-12345   |
| Reviewer | reviewer@bookpub.com   | reviewer123 | reviewer-api-key-67890|

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

## - cURL Examples

### Authentication

```bash
# Login and get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@bookpub.com","password":"admin123"}'

# Get current user
curl http://localhost:3000/api/auth/me \
  -H "X-API-Key: admin-api-key-12345"
```

### Books CRUD

```bash
# List books
curl http://localhost:3000/api/books \
  -H "X-API-Key: admin-api-key-12345"

# List with pagination
curl "http://localhost:3000/api/books?limit=2" \
  -H "X-API-Key: admin-api-key-12345"

# Create a book
curl -X POST http://localhost:3000/api/books \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Clean Architecture",
    "authors": "Robert C. Martin",
    "publishedBy": "Prentice Hall"
  }'

# Get a book by ID
curl http://localhost:3000/api/books/{book-id} \
  -H "X-API-Key: admin-api-key-12345"

# Update a book
curl -X PATCH http://localhost:3000/api/books/{book-id} \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title": "Clean Architecture - 2nd Edition"}'

# Delete a book
curl -X DELETE http://localhost:3000/api/books/{book-id} \
  -H "X-API-Key: admin-api-key-12345"

# Restore a deleted book (admin only)
curl -X POST http://localhost:3000/api/books/{book-id}/restore \
  -H "X-API-Key: admin-api-key-12345"
```

### Audit Trail (Admin Only)

```bash
# List all audits
curl http://localhost:3000/api/audits \
  -H "X-API-Key: admin-api-key-12345"

# Filter by entity
curl "http://localhost:3000/api/audits?entity=Book" \
  -H "X-API-Key: admin-api-key-12345"

# Filter by action
curl "http://localhost:3000/api/audits?action=update" \
  -H "X-API-Key: admin-api-key-12345"

# Filter by date range
curl "http://localhost:3000/api/audits?from=2025-01-01T00:00:00Z&to=2025-12-31T23:59:59Z" \
  -H "X-API-Key: admin-api-key-12345"

# Filter by specific field changes
curl "http://localhost:3000/api/audits?fieldsChanged=title,authors" \
  -H "X-API-Key: admin-api-key-12345"

# Combined filters
curl "http://localhost:3000/api/audits?entity=Book&action=update&fieldsChanged=title&limit=5" \
  -H "X-API-Key: admin-api-key-12345"

# Get specific audit
curl http://localhost:3000/api/audits/{audit-id} \
  -H "X-API-Key: admin-api-key-12345"

# Get auditable entities list
curl http://localhost:3000/api/audits/entities \
  -H "X-API-Key: admin-api-key-12345"
```

### Access Control Demo

```bash
# Reviewer trying to access audits (should fail with 403)
curl http://localhost:3000/api/audits \
  -H "X-API-Key: reviewer-api-key-67890"
# Response: {"error":{"code":"FORBIDDEN","message":"Access denied..."}}

# Reviewer can access books
curl http://localhost:3000/api/books \
  -H "X-API-Key: reviewer-api-key-67890"
# Response: {...books...}
```

## - Typical Workflow Demo

```bash
# 1. Create a book
BOOK_ID=$(curl -s -X POST http://localhost:3000/api/books \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","authors":"Test Author","publishedBy":"Test Publisher"}' \
  | jq -r '.id')

echo "Created book: $BOOK_ID"

# 2. Update the book
curl -s -X PATCH http://localhost:3000/api/books/$BOOK_ID \
  -H "X-API-Key: admin-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Test Book"}'

# 3. Delete the book
curl -s -X DELETE http://localhost:3000/api/books/$BOOK_ID \
  -H "X-API-Key: admin-api-key-12345"

# 4. View audit trail for this book
curl -s "http://localhost:3000/api/audits?entityId=$BOOK_ID" \
  -H "X-API-Key: admin-api-key-12345" | jq '.items[] | {action, fieldsChanged, timestamp}'

# 5. Restore the book
curl -s -X POST http://localhost:3000/api/books/$BOOK_ID/restore \
  -H "X-API-Key: admin-api-key-12345"

# 6. View complete audit trail
curl -s "http://localhost:3000/api/audits?entityId=$BOOK_ID" \
  -H "X-API-Key: admin-api-key-12345" | jq '.items'
```

## - Architecture

### Clean Architecture Layers

```
Routes → Controllers → Services → Repositories
           ↓              ↓           ↓
    Validation      Business      Data Access
                     Logic
```

### Key Design Decisions

1. **Soft Delete**: Books are never permanently deleted. This:
   - Maintains referential integrity
   - Preserves audit history
   - Allows data recovery
   - Shows complete lifecycle in audits

2. **Cursor Pagination**: More efficient than offset-based:
   - O(1) performance regardless of offset
   - Consistent results during pagination
   - Uses indexed columns

3. **AsyncLocalStorage**: Request context propagation:
   - No need to pass requestId/userId through every function
   - Automatic inclusion in all logs
   - Clean separation of concerns

4. **Config-Driven Audit**: Extensibility without code changes:
   - Single source of truth for auditable entities
   - Field exclusion and redaction
   - Easy to add new entities

## - Scripts

```bash
npm run dev       # Start development server with hot reload
npm run build     # Build for production
npm run start     # Start production server
npm run setup     # Setup database and seed data
npm run db:studio # Open Prisma Studio (database UI)
```

## - License

MIT
