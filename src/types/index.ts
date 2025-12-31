import { Request } from 'express';

/**
 * Type Definitions
 */

// User roles
export type UserRole = 'admin' | 'reviewer';

// Audit actions
export type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'login';

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  apiKey: string;
  createdAt: Date;
}

// Book interface
export interface Book {
  id: string;
  title: string;
  authors: string;
  publishedBy: string;
  createdById: string;
  updatedById?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Audit log interface
export interface AuditLog {
  id: string;
  timestamp: Date;
  entity: string;
  entityId: string;
  action: AuditAction;
  actorId: string;
  requestId?: string;
  diff?: string;
  fieldsChanged?: string;
}

// Extended Express Request with user context
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// API Error response
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

// API Response wrapper
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: ApiError;
}

// Audit filter params
export interface AuditFilterParams {
  from?: string;
  to?: string;
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  fieldsChanged?: string;
  requestId?: string;
  limit?: string;
  cursor?: string;
}

// Book create/update DTOs
export interface CreateBookDto {
  title: string;
  authors: string;
  publishedBy: string;
}

export interface UpdateBookDto {
  title?: string;
  authors?: string;
  publishedBy?: string;
}
