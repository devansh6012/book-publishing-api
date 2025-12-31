import { z } from 'zod';

/**
 * Validation Schemas using Zod
 */

// Book validation schemas
export const createBookSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title must be less than 500 characters'),
  authors: z
    .string()
    .min(1, 'Authors is required')
    .max(1000, 'Authors must be less than 1000 characters'),
  publishedBy: z
    .string()
    .min(1, 'Publisher is required')
    .max(500, 'Publisher must be less than 500 characters'),
});

export const updateBookSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(500, 'Title must be less than 500 characters')
    .optional(),
  authors: z
    .string()
    .min(1, 'Authors cannot be empty')
    .max(1000, 'Authors must be less than 1000 characters')
    .optional(),
  publishedBy: z
    .string()
    .min(1, 'Publisher cannot be empty')
    .max(500, 'Publisher must be less than 500 characters')
    .optional(),
});

// Pagination query schema
export const paginationSchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  cursor: z.string().optional(),
});

// Audit filter schema
export const auditFilterSchema = z.object({
  from: z.string().datetime({ message: 'Invalid ISO datetime format' }).optional(),
  to: z.string().datetime({ message: 'Invalid ISO datetime format' }).optional(),
  entity: z.string().max(100).optional(),
  entityId: z.string().uuid({ message: 'Invalid entity ID format' }).optional(),
  actorId: z.string().uuid({ message: 'Invalid actor ID format' }).optional(),
  action: z.enum(['create', 'update', 'delete', 'restore', 'login']).optional(),
  fieldsChanged: z.string().max(500).optional(), // comma-separated
  requestId: z.string().max(100).optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().min(1).max(100))
    .optional(),
  cursor: z.string().optional(),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid ID format' }),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Type exports
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AuditFilterInput = z.infer<typeof auditFilterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
