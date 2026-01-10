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
DATABASE_URL="file:./dev.db"
JWT_SECRET="super-secret-jwt-key"
PORT=3000
NODE_ENV="development"
LOG_LEVEL="info"
LOG_DESTINATION="console"
```

## - Audit Trail Configuration

The audit trail is **config-driven**. To add a new entity, simply update `src/config/audit.config.ts`:
```typescript
export const auditConfig: AuditConfig = {
  Book: {
    track: true,
    exclude: ['updatedAt'],
    redact: [],
  },
  User: {
    track: true,
    exclude: ['updatedAt'],
    redact: ['password', 'apiKey'],
  },
  // Add new entities here - no other code changes needed!
};
```

**No other code changes required!** The audit system automatically:
- Records create/update/delete/restore actions
- Computes diffs between before/after states
- Respects exclude/redact configuration
- Captures requestId for traceability

## - Logging Configuration

### Log Destinations
```env
LOG_DESTINATION="console"   # Console (Development)
LOG_DESTINATION="file"      # File
LOG_DESTINATION="elastic"   # Elasticsearch
LOG_DESTINATION="logtail"   # Logtail
```

### Log Format
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
  -d '{"title":"Clean Architecture","authors":"Robert C. Martin","publishedBy":"Prentice Hall"}'

# Update a book
curl -X PATCH http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books/{book-id} \
  -H "X-API-Key: admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Architecture - 2nd Edition"}'

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
```

### Access Control Demo
```bash
# Reviewer trying to access audits (403 Forbidden)
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/audits \
  -H "X-API-Key: reviewer-api-key"

# Reviewer can access books
curl http://ec2-3-7-71-71.ap-south-1.compute.amazonaws.com/api/books \
  -H "X-API-Key: reviewer-api-key"
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

1. **Soft Delete**: Maintains referential integrity, preserves audit history, allows recovery

2. **Cursor Pagination**: O(1) performance, consistent results during pagination

3. **AsyncLocalStorage**: Automatic requestId/userId propagation without passing through functions

4. **Config-Driven Audit**: Add new entities by updating config only

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