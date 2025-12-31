import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, User } from '../types';
import { setUserId } from '../utils/async-context';
import { config } from '../config';
import { AppError } from './error.middleware';

const prisma = new PrismaClient();

/**
 * Authentication Middleware
 * 
 * Supports two authentication methods:
 * 1. API Key: X-API-Key header
 * 2. JWT: Authorization: Bearer <token>
 */

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    let user: User | null = null;

    // Try API Key authentication first
    if (apiKey) {
      const dbUser = await prisma.user.findUnique({
        where: { apiKey },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          createdAt: true,
        },
      });

      if (dbUser) {
        user = dbUser as User;
      }
    }

    // Try JWT authentication
    if (!user && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            apiKey: true,
            createdAt: true,
          },
        });

        if (dbUser) {
          user = dbUser as User;
        }
      } catch (jwtError) {
        // JWT verification failed, continue without auth
      }
    }

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Authentication required', 401);
    }

    // Attach user to request
    req.user = user;

    // Set userId in async context for logging
    setUserId(user.id);

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional Auth Middleware
 * 
 * Attempts to authenticate but doesn't fail if no auth provided.
 * Useful for endpoints that behave differently for authenticated users.
 */
export async function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers.authorization;

    if (apiKey) {
      const user = await prisma.user.findUnique({
        where: { apiKey },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          apiKey: true,
          createdAt: true,
        },
      });

      if (user) {
        req.user = user as User;
        setUserId(user.id);
      }
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            apiKey: true,
            createdAt: true,
          },
        });

        if (user) {
          req.user = user as User;
          setUserId(user.id);
        }
      } catch {
        // JWT verification failed, continue without auth
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
