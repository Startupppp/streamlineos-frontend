import { isRecord } from "@/lib/is-record";

/**
 * Backend recruitment list endpoints return ListResponse:
 * { items, total, page, pageSize, totalPages } (+ optional extras).
 * Older handlers (or tests) may still return a bare array.
 */

export interface RecruitmentListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function isRecruitmentListResponse<T>(
  res: unknown,
): res is RecruitmentListResponse<T> {
  return isRecord(res) && Array.isArray(res.items);
}

export function normalizeRecruitmentList<T>(
  res: T[] | RecruitmentListResponse<T> | null | undefined,
  fallbackPageSize = 100,
): RecruitmentListResponse<T> {
  if (!res) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: fallbackPageSize,
      totalPages: 0,
    };
  }
  if (Array.isArray(res)) {
    return {
      items: res,
      total: res.length,
      page: 1,
      pageSize: res.length || fallbackPageSize,
      totalPages: res.length > 0 ? 1 : 0,
    };
  }
  if (isRecruitmentListResponse<T>(res)) {
    return {
      items: Array.isArray(res.items) ? res.items : [],
      total: Number(res.total) || 0,
      page: Number(res.page) || 1,
      pageSize: Number(res.pageSize) || fallbackPageSize,
      totalPages: Number(res.totalPages) || 0,
    };
  }
  return {
    items: [],
    total: 0,
    page: 1,
    pageSize: fallbackPageSize,
    totalPages: 0,
  };
}

/** Safe list extract for pages and pickers that expect T[]. */
export function unwrapRecruitmentItems<T>(
  res: T[] | RecruitmentListResponse<T> | null | undefined,
): T[] {
  return normalizeRecruitmentList(res).items;
}
