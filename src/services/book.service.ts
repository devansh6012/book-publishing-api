import { Book, CreateBookDto, UpdateBookDto } from '../types';
import { PaginatedResult, PaginationParams } from '../utils/pagination';
import * as bookRepo from '../repositories/book.repository';
import { AppError } from '../middleware/error.middleware';

/**
 * Book Service
 * 
 * Business logic layer for book operations.
 */

/**
 * Get all books with pagination
 */
export async function getBooks(
  params: PaginationParams,
  includeDeleted = false
): Promise<PaginatedResult<Book>> {
  return bookRepo.findBooks(params, includeDeleted);
}

/**
 * Get book by ID
 */
export async function getBookById(id: string, includeDeleted = false): Promise<Book> {
  const book = await bookRepo.findBookById(id, includeDeleted);
  
  if (!book) {
    throw new AppError('NOT_FOUND', `Book with ID ${id} not found`, 404);
  }
  
  return book;
}

/**
 * Create a new book
 */
export async function createBook(data: CreateBookDto, userId: string): Promise<Book> {
  return bookRepo.createBook(data, userId);
}

/**
 * Update a book
 */
export async function updateBook(
  id: string,
  data: UpdateBookDto,
  userId: string
): Promise<Book> {
  // Check if book exists and is not deleted
  const existing = await bookRepo.findBookById(id);
  if (!existing) {
    throw new AppError('NOT_FOUND', `Book with ID ${id} not found`, 404);
  }
  
  // Check if there are actually changes
  const hasChanges = Object.entries(data).some(
    ([key, value]) => value !== undefined && existing[key as keyof Book] !== value
  );
  
  if (!hasChanges) {
    return existing;
  }
  
  return bookRepo.updateBook(id, data, userId);
}

/**
 * Delete a book (soft delete)
 */
export async function deleteBook(id: string, userId: string): Promise<Book> {
  // Check if book exists
  const existing = await bookRepo.findBookById(id, true);
  if (!existing) {
    throw new AppError('NOT_FOUND', `Book with ID ${id} not found`, 404);
  }
  
  if (existing.isDeleted) {
    throw new AppError('ALREADY_DELETED', `Book with ID ${id} is already deleted`, 400);
  }
  
  return bookRepo.deleteBook(id, userId);
}

/**
 * Restore a deleted book
 */
export async function restoreBook(id: string, userId: string): Promise<Book> {
  // Check if book exists
  const existing = await bookRepo.findBookById(id, true);
  if (!existing) {
    throw new AppError('NOT_FOUND', `Book with ID ${id} not found`, 404);
  }
  
  if (!existing.isDeleted) {
    throw new AppError('NOT_DELETED', `Book with ID ${id} is not deleted`, 400);
  }
  
  return bookRepo.restoreBook(id, userId);
}
