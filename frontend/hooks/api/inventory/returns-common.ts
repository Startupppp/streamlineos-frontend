import type { UseQueryOptions } from "@tanstack/react-query";

export const CUSTOMER_RETURNS_PERMISSION = "inventory:customer-returns:manage";
export const VENDOR_RETURNS_PERMISSION = "inventory:vendor-returns:manage";

export type ReturnStatus = "DRAFT" | "APPROVED" | "POSTED" | "CANCELLED";

export type CustomerReturnDisposition =
  | "RESTOCK"
  | "QUARANTINE"
  | "SCRAP"
  | "RETURN_TO_VENDOR";

export type VendorReturnReason =
  | "DAMAGED"
  | "WRONG_ITEM"
  | "EXCESS"
  | "EXPIRED"
  | "QUALITY_REJECTED";

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

type ReturnFilters = {
  status?: ReturnStatus;
  page?: number;
  limit?: number;
};

function returnListParams(filters?: ReturnFilters): Record<string, string> {
  return {
    ...(filters?.status !== undefined ? { status: filters.status } : {}),
    ...(filters?.page !== undefined ? { page: String(filters.page) } : {}),
    ...(filters?.limit !== undefined ? { limit: String(filters.limit) } : {}),
  };
}

export interface ApproveReturnInput {
  returnId: number;
  creditReference?: string;
}

export interface PostReturnInput {
  returnId: number;
  reason?: string;
}

export interface CancelReturnInput {
  returnId: number;
}

type ListOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

export type { PaginatedResponse, ReturnFilters, ListOptions };
export { returnListParams };
