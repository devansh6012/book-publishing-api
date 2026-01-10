import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../types';
import * as userRepo from '../repositories/user.repository';
import { AppError } from '../middleware/error.middleware';
import { config } from '../config';
import { createAuditLog } from '../repositories/audit.repository';

/**
 * Auth Service
 *
 * Handles authentication and token generation.
 */

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

interface LoginResult {
  user: User;
  token: string;
  expiresIn: string;
}

/**
 * Login with email and password
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await userRepo.validateCredentials(email, password);

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  // Generate JWT token
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Define sign options with proper typing
  const signOptions: SignOptions = {
    expiresIn: '24h',
  };

  const token = jwt.sign(payload, config.jwt.secret, signOptions);

  // Record login in audit log
  await createAuditLog({
    entity: 'User',
    entityId: user.id,
    action: 'login',
    actorId: user.id,
    after: { email: user.email, loginTime: new Date().toISOString() },
  });

  return {
    user,
    token,
    expiresIn: '24h',
  };
}

/**
 * Get current user from token
 */
export async function getCurrentUser(userId: string): Promise<User> {
  const user = await userRepo.findUserById(userId);

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  return user;
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as TokenPayload;
  } catch {
    throw new AppError('INVALID_TOKEN', 'Invalid or expired token', 401);
  }
}