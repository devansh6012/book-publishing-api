import { Response } from 'express';
import { bookService } from '../services';
import { AuthenticatedRequest } from '../types';
import { parsePaginationParams } from '../utils/pagination';
import { createBookSchema, updateBookSchema, idParamSchema } from '../validation/schemas';

/**
 * Book Controller
 * 
 * Handles HTTP requests for book operations.
 */

/**
 * GET /api/books
 * List all books with pagination
 */
export async function listBooks(req: AuthenticatedRequest, res: Response): Promise<void> {
  const paginationParams = parsePaginationParams({
    limit: req.query.limit as string,
    cursor: req.query.cursor as string,
  });

  const includeDeleted = req.query.includeDeleted === 'true' && req.user?.role === 'admin';

  const result = await bookService.getBooks(paginationParams, includeDeleted);

  res.json(result);
}

/**
 * GET /api/books/:id
 * Get a single book by ID
 */
export async function getBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const includeDeleted = req.query.includeDeleted === 'true' && req.user?.role === 'admin';

  const book = await bookService.getBookById(id, includeDeleted);

  res.json(book);
}

/**
 * POST /api/books
 * Create a new book
 */
export async function createBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const data = createBookSchema.parse(req.body);
  const userId = req.user!.id;

  const book = await bookService.createBook(data, userId);

  res.status(201).json({ id: book.id, ...book });
}

/**
 * PATCH /api/books/:id
 * Update a book
 */
export async function updateBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const data = updateBookSchema.parse(req.body);
  const userId = req.user!.id;

  const book = await bookService.updateBook(id, data, userId);

  res.json(book);
}

/**
 * DELETE /api/books/:id
 * Soft delete a book
 */
export async function deleteBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const userId = req.user!.id;

  await bookService.deleteBook(id, userId);

  res.json({ ok: true });
}

/**
 * POST /api/books/:id/restore
 * Restore a deleted book (admin only)
 */
export async function restoreBook(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = idParamSchema.parse(req.params);
  const userId = req.user!.id;

  const book = await bookService.restoreBook(id, userId);

  res.json(book);
}
