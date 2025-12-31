/**
 * Audit Configuration
 * 
 * This configuration controls which entities are tracked in the audit trail
 * and how their data is handled (excluded fields, redacted fields).
 * 
 * To add a new entity to audit tracking:
 * 1. Add entry to this config object
 * 2. That's it! No other code changes needed.
 * 
 * Options per entity:
 * - track: boolean - Whether to track this entity
 * - exclude: string[] - Fields to exclude from diff (won't appear in audit log)
 * - redact: string[] - Fields to redact in diff (will appear as '[REDACTED]')
 */

export interface AuditEntityConfig {
  track: boolean;
  exclude: string[];
  redact: string[];
}

export interface AuditConfig {
  [entity: string]: AuditEntityConfig;
}

export const auditConfig: AuditConfig = {
  Book: {
    track: true,
    exclude: ['updatedAt'],  // Don't track automatic timestamp changes
    redact: [],              // No sensitive fields to redact
  },
  User: {
    track: true,
    exclude: ['updatedAt'],
    redact: ['password', 'apiKey'],  // Sensitive credentials - show as [REDACTED]
  },
  // Easy to extend. Just add new entities here:
  // Publisher: {
  //   track: true,
  //   exclude: ['updatedAt'],
  //   redact: ['taxId'],
  // },
} as const;

/**
 * Check if an entity is auditable
 */
export function isAuditable(entity: string): boolean {
  return entity in auditConfig && auditConfig[entity].track;
}

/**
 * Get audit config for an entity
 */
export function getEntityAuditConfig(entity: string): AuditEntityConfig | null {
  if (!isAuditable(entity)) return null;
  return auditConfig[entity];
}

/**
 * Get list of all auditable entities
 */
export function getAuditableEntities(): string[] {
  return Object.entries(auditConfig)
    .filter(([_, config]) => config.track)
    .map(([entity]) => entity);
}
