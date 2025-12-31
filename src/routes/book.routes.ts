import { Router } from 'express';
import { bookController } from '../controllers';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin, requireAuthenticatedUser } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Book Routes
 * 
 * All routes require authentication.
 * Restore endpoint requires admin role.
 */

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List books (paginated)
router.get('/', asyncHandler(bookController.listBooks));

// Get single book
router.get('/:id', asyncHandler(bookController.getBook));

// Create book
router.post('/', requireAuthenticatedUser, asyncHandler(bookController.createBook));

// Update book
router.patch('/:id', requireAuthenticatedUser, asyncHandler(bookController.updateBook));

// Delete book (soft delete)
router.delete('/:id', requireAuthenticatedUser, asyncHandler(bookController.deleteBook));

// Restore deleted book (admin only)
router.post('/:id/restore', requireAdmin, asyncHandler(bookController.restoreBook));

export default router;
