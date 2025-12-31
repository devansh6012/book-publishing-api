import { getEntityAuditConfig, AuditEntityConfig } from '../config/audit.config';

/**
 * Diff Utility for Audit Trail
 * 
 * Computes differences between before/after states,
 * respecting exclude/redact configuration.
 */

export interface DiffResult {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  fieldsChanged: string[];
}

/**
 * Process a value according to audit config (exclude or redact)
 */
function processValue(
  key: string,
  value: unknown,
  config: AuditEntityConfig
): unknown | null {
  // Exclude field entirely
  if (config.exclude.includes(key)) {
    return null;
  }
  
  // Redact sensitive fields
  if (config.redact.includes(key)) {
    return '[REDACTED]';
  }
  
  return value;
}

/**
 * Process an object according to audit config
 */
function processObject(
  obj: Record<string, unknown> | null,
  config: AuditEntityConfig
): Record<string, unknown> {
  if (!obj) return {};
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const processedValue = processValue(key, value, config);
    if (processedValue !== null) {
      result[key] = processedValue;
    }
  }
  
  return result;
}

/**
 * Compute diff between two objects for audit logging
 */
export function computeDiff(
  entity: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): DiffResult | null {
  const config = getEntityAuditConfig(entity);
  if (!config) return null;

  const processedBefore = processObject(before, config);
  const processedAfter = processObject(after, config);
  
  const fieldsChanged: string[] = [];
  
  // Find all keys that changed
  const allKeys = new Set([
    ...Object.keys(processedBefore),
    ...Object.keys(processedAfter),
  ]);
  
  for (const key of allKeys) {
    const beforeVal = processedBefore[key];
    const afterVal = processedAfter[key];
    
    // Compare values (handles dates, nulls, etc.)
    const beforeStr = JSON.stringify(beforeVal);
    const afterStr = JSON.stringify(afterVal);
    
    if (beforeStr !== afterStr) {
      fieldsChanged.push(key);
    }
  }
  
  return {
    before: processedBefore,
    after: processedAfter,
    fieldsChanged,
  };
}

/**
 * Compute diff for create action (no before state)
 */
export function computeCreateDiff(
  entity: string,
  data: Record<string, unknown>
): DiffResult | null {
  return computeDiff(entity, null, data);
}

/**
 * Compute diff for delete action (no after state)
 */
export function computeDeleteDiff(
  entity: string,
  data: Record<string, unknown>
): DiffResult | null {
  return computeDiff(entity, data, null);
}

/**
 * Compute diff for update action
 */
export function computeUpdateDiff(
  entity: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): DiffResult | null {
  return computeDiff(entity, before, after);
}
