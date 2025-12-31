import { Request, Response, NextFunction } from 'express';
import { getRequestDuration } from '../utils/async-context';
import { logger } from '../utils/logger';

/**
 * HTTP Request Logging Middleware
 * 
 * Logs every HTTP request with:
 * - Method, route, status
 * - Duration in milliseconds
 * - RequestId and UserId from context
 */
export function httpLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Capture original end function
  const originalEnd = res.end;
  
  // Override end to log after response is sent
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Call original end
    const result = originalEnd.call(this, chunk, encoding, callback);
    
    // Log the request
    const durationMs = getRequestDuration();
    logger.httpLog({
      route: req.path,
      method: req.method,
      status: res.statusCode,
      durationMs,
    });
    
    return result;
  };
  
  next();
}
