import { Router } from 'express';
import { authController } from '../controllers';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Auth Routes
 */

const router = Router();

// Login (public)
router.post('/login', asyncHandler(authController.login));

// Get current user (requires auth)
router.get('/me', authMiddleware, asyncHandler(authController.getCurrentUser));

export default router;
