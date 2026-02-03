import { z } from "zod";

/**
 * Standard pagination input schema for list endpoints.
 */
export const paginationInputSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * Optional pagination input - makes pagination parameters optional
 * for backwards compatibility with existing endpoints.
 */
export const optionalPaginationInputSchema = z.object({
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional(),
});

export type PaginationInput = z.infer<typeof paginationInputSchema>;
export type OptionalPaginationInput = z.infer<typeof optionalPaginationInputSchema>;

/**
 * Standard paginated response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Creates a paginated response from data and total count.
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Calculates offset from page and limit.
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Default pagination values.
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
