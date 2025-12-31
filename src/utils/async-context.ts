import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request Context using AsyncLocalStorage
 * 
 * This allows us to propagate requestId and userId across
 * the entire request lifecycle without passing them explicitly.
 */

export interface RequestContext {
  requestId: string;
  userId?: string;
  startTime: number;
}

// Create the AsyncLocalStorage instance
export const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Get the current request ID
 */
export function getRequestId(): string | undefined {
  return getRequestContext()?.requestId;
}

/**
 * Get the current user ID
 */
export function getUserId(): string | undefined {
  return getRequestContext()?.userId;
}

/**
 * Set the user ID in the current context
 */
export function setUserId(userId: string): void {
  const context = getRequestContext();
  if (context) {
    context.userId = userId;
  }
}

/**
 * Get request duration in milliseconds
 */
export function getRequestDuration(): number {
  const context = getRequestContext();
  if (context) {
    return Date.now() - context.startTime;
  }
  return 0;
}

/**
 * Run a function within a request context
 */
export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return asyncLocalStorage.run(context, fn);
}
