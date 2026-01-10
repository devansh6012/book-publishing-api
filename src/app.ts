import 'dotenv/config';

import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import routes from './routes';
import {
  requestContextMiddleware,
  httpLoggerMiddleware,
  errorHandler,
  notFoundHandler,
} from './middleware';

/**
 * Book Publishing API
 * 
 * A minimal API with config-driven audit trail, RBAC, and comprehensive logging.
 */

const app = express();

// Trust proxy (for correct IP in logs behind reverse proxy)
app.set('trust proxy', true);

// Request context middleware (must be first)
app.use(requestContextMiddleware);

// HTTP request logging
app.use(httpLoggerMiddleware);

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Central error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  logger.info(`Server started`, {
    port: PORT
  });
  console.log(`
--- Book Publishing API ---
Server running on: http://localhost:${PORT}
Environment: ${config.nodeEnv}
Health check: http://localhost:${PORT}/api/health

- API Endpoints:
   POST   /api/auth/login          - Login (get JWT token)
   GET    /api/auth/me             - Get current user

   GET    /api/books               - List books (paginated)
   POST   /api/books               - Create book
   GET    /api/books/:id           - Get book
   PATCH  /api/books/:id           - Update book
   DELETE /api/books/:id           - Delete book
   POST   /api/books/:id/restore   - Restore book (admin)

   GET    /api/audits              - List audits (admin)
   GET    /api/audits/:id          - Get audit (admin)
   GET    /api/audits/entities     - Get auditable entities (admin)

- Test Credentials:
   Admin:    admin@bookpub.com / admin123
             API Key: admin-api-key
   Reviewer: reviewer@bookpub.com / reviewer123
             API Key: reviewer-api-key
`);
});

export default app;
