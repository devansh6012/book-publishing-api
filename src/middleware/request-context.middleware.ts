import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncLocalStorage, RequestContext } from '../utils/async-context';

/**
 * Request Context Middleware
 * 
 * Sets up AsyncLocalStorage context for each request with:
 * - Unique requestId for tracing
 * - Start time for duration tracking
 * - userId (populated later by auth middleware)
 */
export function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get or generate request ID from header
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Set request ID in response header for client correlation
  res.setHeader('x-request-id', requestId);
  
  // Create request context
  const context: RequestContext = {
    requestId,
    startTime: Date.now(),
  };
  
  // Run the rest of the request within this context
  asyncLocalStorage.run(context, () => {
    next();
  });
}
