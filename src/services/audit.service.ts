import { AuditLog, AuditFilterParams } from '../types';
import { PaginatedResult } from '../utils/pagination';
import * as auditRepo from '../repositories/audit.repository';
import { AppError } from '../middleware/error.middleware';
import { getAuditableEntities } from '../config/audit.config';

/**
 * Audit Service
 * 
 * Business logic layer for audit log operations.
 */

/**
 * Get audit logs with filters
 */
export async function getAuditLogs(
  filters: AuditFilterParams
): Promise<PaginatedResult<AuditLog>> {
  // Validate entity filter if provided
  if (filters.entity) {
    const auditableEntities = getAuditableEntities();
    if (!auditableEntities.includes(filters.entity)) {
      throw new AppError(
        'INVALID_ENTITY',
        `Entity '${filters.entity}' is not auditable. Valid entities: ${auditableEntities.join(', ')}`,
        400
      );
    }
  }

  // Validate date range
  if (filters.from && filters.to) {
    const fromDate = new Date(filters.from);
    const toDate = new Date(filters.to);
    if (fromDate > toDate) {
      throw new AppError(
        'INVALID_DATE_RANGE',
        'From date must be before to date',
        400
      );
    }
  }

  return auditRepo.findAuditLogs(filters);
}

/**
 * Get audit log by ID
 */
export async function getAuditById(id: string): Promise<AuditLog> {
  const audit = await auditRepo.findAuditById(id);
  
  if (!audit) {
    throw new AppError('NOT_FOUND', `Audit log with ID ${id} not found`, 404);
  }
  
  return audit;
}

/**
 * Get list of auditable entities
 */
export function getAuditableEntityList(): string[] {
  return getAuditableEntities();
}
