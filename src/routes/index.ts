import { Router } from 'express';
import bookRoutes from './book.routes';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// ============================================
// PRODUCTION TEMPORARY SEED ENDPOINT - DELETE AFTER USE!
// ============================================
router.get('/seed-database', async (req, res) => {
  try {
    // Check if already seeded (idempotent)
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@bookpub.com' }
    });
    
    if (existingAdmin) {
      return res.json({ 
        message: 'Database already seeded!',
        note: 'No changes made - data already exists'
      });
    }

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Admin User',
        email: 'admin@bookpub.com',
        role: 'admin',
        apiKey: 'admin-api-key-12345',
        password: adminPassword,
      },
    });

    // Create reviewer user
    const reviewerPassword = await bcrypt.hash('reviewer123', 10);
    const reviewer = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Reviewer User',
        email: 'reviewer@bookpub.com',
        role: 'reviewer',
        apiKey: 'reviewer-api-key-67890',
        password: reviewerPassword,
      },
    });

    // Create sample books
    await prisma.book.createMany({
      data: [
        {
          id: uuidv4(),
          title: 'Why This Code Works',
          authors: 'Ankit Verma',
          publishedBy: 'Penguin',
          createdById: admin.id,
        },
        {
          id: uuidv4(),
          title: 'Fixing Bugs by Adding More Bugs',
          authors: 'Sharma Ji',
          publishedBy: 'Panic Mode Publishing',
          createdById: admin.id,
        },
        {
          id: uuidv4(),
          title: 'How to Eat Almonds and Remember Syntax',
          authors: 'Varun Kumar',
          publishedBy: 'Penguin',
          createdById: reviewer.id,
        },
      ],
    });

    res.json({ 
      message: 'Database seeded successfully!',
      credentials: {
        admin: {
          email: 'admin@bookpub.com',
          password: 'admin123',
          apiKey: 'admin-api-key-12345'
        },
        reviewer: {
          email: 'reviewer@bookpub.com',
          password: 'reviewer123',
          apiKey: 'reviewer-api-key-67890'
        }
      },
      booksCreated: 3
    });
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