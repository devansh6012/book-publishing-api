import { Response, Request } from 'express';
import { authService } from '../services';
import { AuthenticatedRequest } from '../types';
import { loginSchema } from '../validation/schemas';

/**
 * Auth Controller
 * 
 * Handles authentication endpoints.
 */

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = loginSchema.parse(req.body);

  const result = await authService.login(email, password);

  res.json({
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
    },
    token: result.token,
    expiresIn: result.expiresIn,
  });
}

/**
 * GET /api/auth/me
 * Get current user
 */
export async function getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
