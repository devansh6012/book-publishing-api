import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { AppError } from './error.middleware';

/**
 * Role-Based Access Control Middleware
 * 
 * Restricts access to routes based on user roles.
 */

/**
 * Require specific roles to access a route
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role as UserRole)) {
      next(new AppError(
        'FORBIDDEN',
        `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        403
      ));
      return;
    }

    next();
  };
}

/**
 * Require admin role
 */
export const requireAdmin = requireRoles('admin');

/**
 * Require admin or reviewer role
 */
export const requireAuthenticatedUser = requireRoles('admin', 'reviewer');
