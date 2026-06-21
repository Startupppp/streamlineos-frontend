export interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListParams {
  page: number;
  pageSize: number;
}

export function paginateOffset({ page, pageSize }: ListParams): {
  offset: number;
  limit: number;
} {
  return { offset: (page - 1) * pageSize, limit: pageSize };
}

export function buildListResponse<T>(
  items: T[],
  total: number,
  { page, pageSize }: ListParams,
): ListResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
  };
}
