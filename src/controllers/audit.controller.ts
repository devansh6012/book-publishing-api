import { Response } from 'express';
import { auditService } from '../services';
import { AuthenticatedRequest, AuditFilterParams } from '../types';
import { auditFilterSchema, idParamSchema } from '../validation/schemas';

/**
 * Audit Controller
 * 
 * Handles HTTP requests for audit log operations.
 * Admin only access.
 */

/**
 * GET /api/audits
 * List audit logs with filters
 */
export async function listAudits(req: AuthenticatedRequest, res: Response): Promise<void> {
  // Validate and parse query parameters
  const validatedQuery = auditFilterSchema.parse(req.query);

  const filters: AuditFilterParams = {
    from: validatedQuery.from,
    to: validatedQuery.to,
    entity: req.query.entity as string,
    entityId: validatedQuery.entityId,
    actorId: validatedQuery.actorId,
    action: validatedQuery.action,
    fieldsChanged: req.query.fieldsChanged as string,
    requestId: validatedQuery.requestId,
    limit: String(validatedQuery.limit || 10),
    cursor: validatedQuery.cursor,
  };

  const result = await auditService.getAuditLogs(filters);

  // Parse diff JSON for each item
  const itemsWithParsedDiff = result.items.map((item) => ({
    ...item,
    diff: item.diff ? JSON.parse(item.diff) : null,
    fieldsChanged: item.fieldsChanged ? item.fieldsChanged.split(',') : [],
  }));

  res.json({
    ...result,
    items: itemsWithParsedDiff,
  });
}

/**
 * GET /api/audits/:id
 * Get a single audit log by ID
 */
export async function getAudit(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);

  const audit = await auditService.getAuditById(id);

  // Parse diff JSON
  const auditWithParsedDiff = {
    ...audit,
    diff: audit.diff ? JSON.parse(audit.diff) : null,
    fieldsChanged: audit.fieldsChanged ? audit.fieldsChanged.split(',') : [],
  };

  res.json(auditWithParsedDiff);
}

/**
 * GET /api/audits/entities
 * Get list of auditable entities
 */
export async function getAuditableEntities(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const entities = auditService.getAuditableEntityList();
  res.json({ entities });
}
