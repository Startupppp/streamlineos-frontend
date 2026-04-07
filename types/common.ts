/** Shared pagination wrapper for all list endpoints */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Standard API success/error envelope for mutations */
export type ApiOk<T = void> = { success: true; data: T };
export type ApiErr = { success: false; error: string };
export type ApiResult<T = void> = ApiOk<T> | ApiErr;

/** Utility: unwrap T from Promise */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
