import { logger as baseLogger } from '../config/logger.config';
import { getRequestId, getUserId } from './async-context';

/**
 * Application Logger
 * 
 * Automatically includes requestId and userId from AsyncLocalStorage
 * on every log line for traceability.
 */

interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  [key: string]: unknown;
}

function enrichContext(context: LogContext = {}): LogContext {
  return {
    requestId: getRequestId(),
    userId: getUserId(),
    ...context,
  };
}

export const appLogger = {
  info(msg: string, context?: LogContext): void {
    baseLogger.info(enrichContext(context), msg);
  },

  error(msg: string, context?: LogContext): void {
    baseLogger.error(enrichContext(context), msg);
  },

  warn(msg: string, context?: LogContext): void {
    baseLogger.warn(enrichContext(context), msg);
  },

  debug(msg: string, context?: LogContext): void {
    baseLogger.debug(enrichContext(context), msg);
  },

  trace(msg: string, context?: LogContext): void {
    baseLogger.trace(enrichContext(context), msg);
  },

  fatal(msg: string, context?: LogContext): void {
    baseLogger.fatal(enrichContext(context), msg);
  },

  // Log HTTP request completion
  httpLog(params: {
    route: string;
    method: string;
    status: number;
    durationMs: number;
    error?: string;
  }): void {
    const level = params.status >= 500 ? 'error' : params.status >= 400 ? 'warn' : 'info';
    const msg = `${params.method} ${params.route} ${params.status} ${params.durationMs}ms`;
    
    baseLogger[level](enrichContext({
      route: params.route,
      method: params.method,
      status: params.status,
      durationMs: params.durationMs,
      ...(params.error && { error: params.error }),
    }), msg);
  },

  // Log audit events
  auditLog(params: {
    entity: string;
    entityId: string;
    action: string;
    actorId: string;
  }): void {
    baseLogger.info(enrichContext({
      auditEvent: true,
      entity: params.entity,
      entityId: params.entityId,
      action: params.action,
      actorId: params.actorId,
    }), `AUDIT: ${params.action} ${params.entity}:${params.entityId} by ${params.actorId}`);
  },
};

export { appLogger as logger };
