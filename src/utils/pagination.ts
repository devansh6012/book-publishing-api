import { config } from '../config';

/**
 * Cursor-based Pagination Utility
 * 
 * Using cursor-based pagination because:
 * 1. More efficient for large datasets (no offset calculation)
 * 2. Consistent results even when data changes
 * 3. Better performance as it uses indexed columns
 * 4. Works well with real-time data
 */

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
}

export interface CursorData {
  id: string;
  timestamp?: string;
}

/**
 * Encode cursor data to base64 string
 */
export function encodeCursor(data: CursorData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Decode base64 cursor to cursor data
 */
export function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorData;
  } catch {
    return null;
  }
}

/**
 * Parse pagination params from query string
 */
export function parsePaginationParams(query: {
  limit?: string;
  cursor?: string;
}): PaginationParams {
  const limit = Math.min(
    Math.max(parseInt(query.limit || String(config.pagination.defaultLimit), 10), 1),
    config.pagination.maxLimit
  );
  
  return {
    limit,
    cursor: query.cursor,
  };
}

/**
 * Create paginated response from items
 */
export function createPaginatedResponse<T extends { id: string; createdAt?: Date; timestamp?: Date }>(
  items: T[],
  limit: number,
  useTimestamp: boolean = false
): PaginatedResult<T> {
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;
  
  let nextCursor: string | undefined;
  if (hasMore && resultItems.length > 0) {
    const lastItem = resultItems[resultItems.length - 1];
    const timestampField = useTimestamp ? lastItem.timestamp : lastItem.createdAt;
    nextCursor = encodeCursor({
      id: lastItem.id,
      timestamp: timestampField?.toISOString(),
    });
  }
  
  return {
    items: resultItems,
    nextCursor,
    hasMore,
  };
}
