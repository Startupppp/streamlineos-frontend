/** Shared list pagination shape used by HR (and other) list endpoints. */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
};

/** Normalize either a legacy array response or a paginated object. */
export function normalizePaginated<T>(
  data: PaginatedResult<T> | T[] | null | undefined,
  fallbackPageSize = 20,
): PaginatedResult<T> {
  if (!data) {
    return { items: [], total: 0, page: 1, pageSize: fallbackPageSize, totalPages: 0 };
  }
  if (Array.isArray(data)) {
    return {
      items: data,
      total: data.length,
      page: 1,
      pageSize: data.length || fallbackPageSize,
      totalPages: data.length > 0 ? 1 : 0,
    };
  }
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    page: data.page ?? 1,
    pageSize: data.pageSize ?? fallbackPageSize,
    totalPages:
      data.totalPages ??
      (data.pageSize > 0 ? Math.ceil((data.total ?? 0) / data.pageSize) : 0),
    statusCounts: data.statusCounts,
  };
}
