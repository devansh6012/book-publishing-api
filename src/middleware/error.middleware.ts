import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getRequestId } from '../utils/async-context';
import { logger } from '../utils/logger';
import { ApiError } from '../types';

/**
 * Custom Application Error
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    details?: unknown
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Format Zod validation errors
 */
function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Central Error Handler Middleware
 * 
 * Returns standardized error responses:
 * {
 *   error: {
 *     code: string,
 *     message: string,
 *     details?: any,
 *     requestId: string
 *   }
 * }
 * 
 * Does not leak stack traces in production.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = getRequestId() || 'unknown';
  const isProduction = process.env.NODE_ENV === 'production';

  let statusCode = 500;
  let errorResponse: ApiError = {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    requestId,
  };

  // Handle AppError (our custom errors)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorResponse = {
      code: err.code,
      message: err.message,
      details: err.details,
      requestId,
    };
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorResponse = {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: formatZodError(err),
      requestId,
    };
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      requestId,
    };
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
      requestId,
    };
  }
  // Handle Prisma errors
  else if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      statusCode = 409;
      errorResponse = {
        code: 'DUPLICATE_ENTRY',
        message: 'A record with this value already exists',
        requestId,
      };
    } else if (prismaError.code === 'P2025') {
      statusCode = 404;
      errorResponse = {
        code: 'NOT_FOUND',
        message: 'Record not found',
        requestId,
      };
    }
  }

  // Log the error
  logger.error(`${statusCode} ${errorResponse.code}: ${errorResponse.message}`, {
    error: isProduction ? undefined : err.stack,
    route: req.path,
    method: req.method,
    status: statusCode,
  });

  // Include stack trace in development
  if (!isProduction && err.stack && !(err instanceof AppError)) {
    errorResponse.details = {
      ...((errorResponse.details as object) || {}),
      stack: err.stack.split('\n'),
    };
  }

  res.status(statusCode).json({ error: errorResponse });
}

/**
 * Not Found Handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = getRequestId() || 'unknown';
  
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
    },
  });
}

/**
 * Async Handler Wrapper
 * 
 * Wraps async route handlers to catch errors and pass to error middleware.
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
