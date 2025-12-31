import { PrismaClient, Prisma } from '@prisma/client';
import { Book, CreateBookDto, UpdateBookDto } from '../types';
import { decodeCursor, encodeCursor, PaginatedResult, PaginationParams } from '../utils/pagination';
import { recordCreate, recordUpdate, recordDelete, recordRestore } from './audit.repository';
import { config } from '../config';

const prisma = new PrismaClient();

/**
 * Book Repository
 * 
 * Handles all book CRUD operations with integrated audit logging.
 * Uses soft delete for better auditability.
 */

/**
 * Find book by ID
 */
export async function findBookById(id: string, includeDeleted = false): Promise<Book | null> {
  const book = await prisma.book.findFirst({
    where: {
      id,
      ...(includeDeleted ? {} : { isDeleted: false }),
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });
  return book as Book | null;
}

/**
 * Find all books with pagination
 */
export async function findBooks(
  params: PaginationParams,
  includeDeleted = false
): Promise<PaginatedResult<Book>> {
  const { limit, cursor } = params;
  const takeLimit = Math.min(limit, config.pagination.maxLimit);

  // Build where clause
  const where: Prisma.BookWhereInput = includeDeleted ? {} : { isDeleted: false };

  // Cursor pagination
  let cursorCondition: Prisma.BookWhereInput | undefined;
  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      cursorCondition = {
        OR: [
          {
            createdAt: { lt: new Date(cursorData.timestamp || '') },
          },
          {
            createdAt: new Date(cursorData.timestamp || ''),
            id: { lt: cursorData.id },
          },
        ],
      };
    }
  }

  // Combine conditions
  const finalWhere: Prisma.BookWhereInput = cursorCondition
    ? { AND: [where, cursorCondition] }
    : where;

  // Fetch books (one extra for pagination)
  const books = await prisma.book.findMany({
    where: finalWhere,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: takeLimit + 1,
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });

  // Check for more items
  const hasMore = books.length > takeLimit;
  const resultItems = hasMore ? books.slice(0, takeLimit) : books;

  // Generate next cursor
  let nextCursor: string | undefined;
  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    nextCursor = encodeCursor({
      id: lastItem.id,
      timestamp: lastItem.createdAt.toISOString(),
    });
  }

  return {
    items: resultItems as Book[],
    nextCursor,
    hasMore,
  };
}

/**
 * Create a new book
 */
export async function createBook(
  data: CreateBookDto,
  userId: string
): Promise<Book> {
  const book = await prisma.book.create({
    data: {
      ...data,
      createdById: userId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  // Record audit log
  await recordCreate('Book', book.id, book as unknown as Record<string, unknown>);

  return book as Book;
}

/**
 * Update a book
 */
export async function updateBook(
  id: string,
  data: UpdateBookDto,
  userId: string
): Promise<Book> {
  // Get current state for audit
  const before = await prisma.book.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Book not found');
  }

  // Update book
  const book = await prisma.book.update({
    where: { id },
    data: {
      ...data,
      updatedById: userId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });

  // Record audit log
  await recordUpdate(
    'Book',
    book.id,
    before as unknown as Record<string, unknown>,
    book as unknown as Record<string, unknown>
  );

  return book as Book;
}

/**
 * Soft delete a book
 * 
 * Using soft delete because:
 * 1. Maintains referential integrity
 * 2. Allows for data recovery
 * 3. Better for audit trails
 * 4. Preserves historical context
 */
export async function deleteBook(id: string, userId: string): Promise<Book> {
  // Get current state for audit
  const before = await prisma.book.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Book not found');
  }

  // Soft delete
  const book = await prisma.book.update({
    where: { id },
    data: {
      isDeleted: true,
      updatedById: userId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });

  // Record audit log
  await recordDelete('Book', book.id, before as unknown as Record<string, unknown>);

  return book as Book;
}

/**
 * Restore a soft-deleted book
 */
export async function restoreBook(id: string, userId: string): Promise<Book> {
  // Get current state for audit
  const before = await prisma.book.findUnique({ where: { id } });
  if (!before) {
    throw new Error('Book not found');
  }

  // Restore
  const book = await prisma.book.update({
    where: { id },
    data: {
      isDeleted: false,
      updatedById: userId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true },
      },
      updatedBy: {
        select: { id: true, name: true },
      },
    },
  });

  // Record audit log
  await recordRestore(
    'Book',
    book.id,
    before as unknown as Record<string, unknown>,
    book as unknown as Record<string, unknown>
  );

  return book as Book;
}
