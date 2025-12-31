import { Router } from 'express';
import bookRoutes from './book.routes';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';

/**
 * API Routes
 */

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/audits', auditRoutes);

export default router;
