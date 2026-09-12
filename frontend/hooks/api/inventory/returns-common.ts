import type { UseQueryOptions } from "@tanstack/react-query";

export const CUSTOMER_RETURNS_PERMISSION = "inventory:customer-returns:manage";
export const VENDOR_RETURNS_PERMISSION = "inventory:vendor-returns:manage";

/** DRAFT -> APPROVED -> POSTED, cancellable from either of the first two. */
export type ReturnStatus = "DRAFT" | "APPROVED" | "POSTED" | "CANCELLED";
export type VendorReturnStatus = ReturnStatus;
export type CustomerReturnStatus = ReturnStatus;

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

/**
 * A type alias, not an interface: only an alias gets TypeScript's implicit index
 * signature, and the query-key factories take `Record<string, unknown>`.
 *
 * `limit`, not `pageSize`. The list endpoint's Zod schema is `.strict()`, so the
 * `pageSize` this used to send was not ignored — it was rejected, and every
 * request the returns page made came back 400.
 */
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
  /** Item 5. A pointer at whatever raised the credit — never a gate on the stock. */
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
