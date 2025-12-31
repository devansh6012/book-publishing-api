import { PrismaClient, Prisma } from '@prisma/client';
import { AuditLog, AuditAction, AuditFilterParams } from '../types';
import { isAuditable } from '../config/audit.config';
import { getRequestId, getUserId } from '../utils/async-context';
import { computeCreateDiff, computeUpdateDiff, computeDeleteDiff, DiffResult } from '../utils/diff';
import { decodeCursor, encodeCursor, PaginatedResult } from '../utils/pagination';
import { logger } from '../utils/logger';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * Audit Repository
 * 
 * Handles all audit log operations with config-driven tracking.
 * Adding a new entity to tracking only requires updating audit.config.ts.
 */

export interface CreateAuditParams {
  entity: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(params: CreateAuditParams): Promise<AuditLog | null> {
  const { entity, entityId, action, actorId, before, after } = params;

  // Check if entity is auditable
  if (!isAuditable(entity)) {
    return null;
  }

  // Compute diff based on action
  let diff: DiffResult | null = null;
  
  if (action === 'create' && after) {
    diff = computeCreateDiff(entity, after);
  } else if (action === 'delete' && before) {
    diff = computeDeleteDiff(entity, before);
  } else if ((action === 'update' || action === 'restore') && before && after) {
    diff = computeUpdateDiff(entity, before, after);
  }

  // Create audit log entry
  const auditLog = await prisma.auditLog.create({
    data: {
      entity,
      entityId,
      action,
      actorId,
      requestId: getRequestId(),
      diff: diff ? JSON.stringify({ before: diff.before, after: diff.after }) : null,
      fieldsChanged: diff?.fieldsChanged.join(',') || null,
    },
  });

  // Log the audit event
  logger.auditLog({
    entity,
    entityId,
    action,
    actorId,
  });

  return auditLog as AuditLog;
}

/**
 * Find audit log by ID
 */
export async function findAuditById(id: string): Promise<AuditLog | null> {
  const audit = await prisma.auditLog.findUnique({
    where: { id },
  });
  return audit as AuditLog | null;
}

/**
 * Find audit logs with filters and pagination
 */
export async function findAuditLogs(
  filters: AuditFilterParams
): Promise<PaginatedResult<AuditLog>> {
  const limit = Math.min(
    parseInt(filters.limit || String(config.pagination.defaultLimit), 10),
    config.pagination.maxLimit
  );

  // Build where clause
  const where: Prisma.AuditLogWhereInput = {};

  if (filters.entity) {
    where.entity = filters.entity;
  }

  if (filters.entityId) {
    where.entityId = filters.entityId;
  }

  if (filters.actorId) {
    where.actorId = filters.actorId;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.requestId) {
    where.requestId = filters.requestId;
  }

  // Date range filters
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) {
      where.timestamp.gte = new Date(filters.from);
    }
    if (filters.to) {
      where.timestamp.lte = new Date(filters.to);
    }
  }

  // Fields changed filter (partial match)
  if (filters.fieldsChanged) {
    const fields = filters.fieldsChanged.split(',').map(f => f.trim());
    where.OR = fields.map(field => ({
      fieldsChanged: { contains: field },
    }));
  }

  // Cursor pagination
  let cursorCondition: Prisma.AuditLogWhereInput | undefined;
  if (filters.cursor) {
    const cursorData = decodeCursor(filters.cursor);
    if (cursorData) {
      cursorCondition = {
        OR: [
          {
            timestamp: { lt: new Date(cursorData.timestamp || '') },
          },
          {
            timestamp: new Date(cursorData.timestamp || ''),
            id: { lt: cursorData.id },
          },
        ],
      };
    }
  }

  // Combine where conditions
  const finalWhere: Prisma.AuditLogWhereInput = cursorCondition
    ? { AND: [where, cursorCondition] }
    : where;

  // Fetch items (one extra to check for more)
  const items = await prisma.auditLog.findMany({
    where: finalWhere,
    orderBy: [{ timestamp: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Determine if there are more items
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  // Generate next cursor
  let nextCursor: string | undefined;
  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    nextCursor = encodeCursor({
      id: lastItem.id,
      timestamp: lastItem.timestamp.toISOString(),
    });
  }

  return {
    items: resultItems as unknown as AuditLog[],
    nextCursor,
    hasMore,
  };
}

/**
 * Helper function to record entity creation
 */
export async function recordCreate(
  entity: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  const actorId = getUserId();
  if (!actorId) return;

  await createAuditLog({
    entity,
    entityId,
    action: 'create',
    actorId,
    after: data,
  });
}

/**
 * Helper function to record entity update
 */
export async function recordUpdate(
  entity: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  const actorId = getUserId();
  if (!actorId) return;

  await createAuditLog({
    entity,
    entityId,
    action: 'update',
    actorId,
    before,
    after,
  });
}

/**
 * Helper function to record entity deletion
 */
export async function recordDelete(
  entity: string,
  entityId: string,
  data: Record<string, unknown>
): Promise<void> {
  const actorId = getUserId();
  if (!actorId) return;

  await createAuditLog({
    entity,
    entityId,
    action: 'delete',
    actorId,
    before: data,
  });
}

/**
 * Helper function to record entity restore
 */
export async function recordRestore(
  entity: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  const actorId = getUserId();
  if (!actorId) return;

  await createAuditLog({
    entity,
    entityId,
    action: 'restore',
    actorId,
    before,
    after,
  });
}
