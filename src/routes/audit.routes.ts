import { Router } from 'express';
import { auditController } from '../controllers';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';

/**
 * Audit Routes
 * 
 * All routes require admin role.
 */

const router = Router();

// All routes require authentication and admin role
router.use(authMiddleware);
router.use(requireAdmin);

// Get list of auditable entities
router.get('/entities', asyncHandler(auditController.getAuditableEntities));

// List audits with filters
router.get('/', asyncHandler(auditController.listAudits));

// Get single audit
router.get('/:id', asyncHandler(auditController.getAudit));

export default router;
