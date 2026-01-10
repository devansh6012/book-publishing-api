import { Router } from 'express';
import bookRoutes from './book.routes';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';
import { seedDatabase } from '../utils/seed';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Seed endpoint (uses shared function)
router.get('/seed-database', async (req, res) => {
  try {
    const result = await seedDatabase();
    res.json(result);
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Seed failed', details: String(error) });
  }
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/books', bookRoutes);
router.use('/audits', auditRoutes);

export default router;