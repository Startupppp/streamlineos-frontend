"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * B9 — the returns data layer, moved out of `operations.ts`.
 *
 * That file owns goods receipts and had grown past the size limit carrying both.
 * Returns now own their own file, which is also where the approval step, the
 * inspection call and the detail read live.
 */

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

export interface VendorReturnLine {
  id: number;
  productVariantId: number;
  /** Decimal string at scale 4 — quantities are exact, never JS floats. */
  quantity: string;
  reason: VendorReturnReason;
  lotId: number | null;
  serialId: number | null;
  unitCost: string | null;
}

export interface VendorReturnSummary {
  id: number;
  returnNumber: string;
  vendorId: number;
  /**
   * Nested, because that is what the endpoint returns. The flat `vendorName`
   * this used to declare existed on no response the API has ever sent, so the
   * Vendor column rendered a dash for every row.
   */
  vendor: { id: number; name: string } | null;
  poId: number | null;
  grnId: number | null;
  status: VendorReturnStatus;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  creditReference: string | null;
  notes: string | null;
  lines: VendorReturnLine[];
}

export interface CustomerReturnLine {
  id: number;
  productVariantId: number;
  /** Decimal string at scale 4 — quantities are exact, never JS floats. */
  quantity: string;
  disposition: CustomerReturnDisposition | null;
  targetLocationId: number | null;
  lotId: number | null;
  serialId: number | null;
  notes: string | null;
  /** INV-209. Null until somebody has actually opened the box. */
  inspectedAt: string | null;
  inspectedBy: string | null;
  inspectionNotes: string | null;
}

export interface CustomerReturnSummary {
  id: number;
  returnNumber: string;
  soId: number | null;
  shipmentId: number | null;
  clientId: number | null;
  /** Nested, for the same reason `vendor` is. `customerName` never existed. */
  client: { id: number; name: string } | null;
  status: CustomerReturnStatus;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  creditReference: string | null;
  notes: string | null;
  lines: CustomerReturnLine[];
}

interface CreateVendorReturnLineInput {
  productVariantId: number;
  locationId: number;
  quantity: string;
  reason: VendorReturnReason;
  lotId?: number;
  serialId?: number;
  unitCost?: string;
}

export interface CreateVendorReturnInput {
  vendorId: number;
  poId?: number;
  grnId?: number;
  notes?: string;
  lines: CreateVendorReturnLineInput[];
}

interface CreateCustomerReturnLineInput {
  productVariantId: number;
  quantity: string;
  reason: string;
  targetLocationId?: number;
  lotId?: number;
  serialId?: number;
}

export interface CreateCustomerReturnInput {
  soId?: number;
  shipmentId?: number;
  clientId?: number;
  notes?: string;
  lines: CreateCustomerReturnLineInput[];
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

export interface InspectReturnLineInput {
  returnId: number;
  lineId: number;
  disposition: CustomerReturnDisposition;
  inspectionNotes?: string;
}

function invalidateCustomerReturn(qc: QueryClient, returnId: number): void {
  void qc.invalidateQueries({ queryKey: queryKeys.returns.customerList });
  void qc.invalidateQueries({ queryKey: queryKeys.inventory.customerReturn(returnId) });
}

function invalidateVendorReturn(qc: QueryClient, returnId: number): void {
  void qc.invalidateQueries({ queryKey: queryKeys.returns.vendorList });
  void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(returnId) });
}

type ListOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

export function useVendorReturns(
  filters?: ReturnFilters,
  options?: ListOptions<PaginatedResponse<VendorReturnSummary>>,
) {
  const canView = useCan(VENDOR_RETURNS_PERMISSION);
  return useQuery<PaginatedResponse<VendorReturnSummary>, Error>({
    queryKey: queryKeys.inventory.vendorReturns(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<VendorReturnSummary>>(
        "/inventory/vendor-returns",
        returnListParams(filters),
      ),
    staleTime: 30_000,
    ...options,
    // After the spread, always: re-declaring `enabled` inside it would clobber
    // the permission gate, and declaring it before would let a caller's `false`
    // be overwritten.
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useVendorReturn(returnId: number | null) {
  const canView = useCan(VENDOR_RETURNS_PERMISSION);
  return useQuery<VendorReturnSummary, Error>({
    queryKey: queryKeys.inventory.vendorReturn(returnId ?? 0),
    queryFn: () => apiClient.get<VendorReturnSummary>(`/inventory/vendor-returns/${returnId}`),
    staleTime: 30_000,
    enabled: canView && returnId !== null,
  });
}

export function useCreateVendorReturn() {
  const qc = useQueryClient();
  return useMutation<VendorReturnSummary, Error, CreateVendorReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<VendorReturnSummary>("/inventory/vendor-returns", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.returns.vendorList });
    },
  });
}

export function useApproveVendorReturn() {
  const qc = useQueryClient();
  return useMutation<VendorReturnSummary, Error, ApproveReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "approve"],
    mutationFn: ({ returnId, creditReference }) =>
      apiClient.post<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}/approve`,
        { ...(creditReference !== undefined ? { creditReference } : {}) },
      ),
    onSuccess: (_, variables) => invalidateVendorReturn(qc, variables.returnId),
  });
}

export function usePostVendorReturn() {
  const qc = useQueryClient();
  return useMutation<VendorReturnSummary, Error, PostReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
      ),
    onSuccess: (_, variables) => {
      invalidateVendorReturn(qc, variables.returnId);
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCancelVendorReturn() {
  const qc = useQueryClient();
  return useMutation<VendorReturnSummary, Error, CancelReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<VendorReturnSummary>(`/inventory/vendor-returns/${returnId}/cancel`, {}),
    onSuccess: (_, variables) => invalidateVendorReturn(qc, variables.returnId),
  });
}

export function useCustomerReturns(
  filters?: ReturnFilters,
  options?: ListOptions<PaginatedResponse<CustomerReturnSummary>>,
) {
  const canView = useCan(CUSTOMER_RETURNS_PERMISSION);
  return useQuery<PaginatedResponse<CustomerReturnSummary>, Error>({
    queryKey: queryKeys.inventory.customerReturns(filters),
    queryFn: () =>
      apiClient.get<PaginatedResponse<CustomerReturnSummary>>(
        "/inventory/customer-returns",
        returnListParams(filters),
      ),
    staleTime: 30_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
}

export function useCustomerReturn(returnId: number | null) {
  const canView = useCan(CUSTOMER_RETURNS_PERMISSION);
  return useQuery<CustomerReturnSummary, Error>({
    queryKey: queryKeys.inventory.customerReturn(returnId ?? 0),
    queryFn: () => apiClient.get<CustomerReturnSummary>(`/inventory/customer-returns/${returnId}`),
    staleTime: 30_000,
    enabled: canView && returnId !== null,
  });
}

export function useCreateCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<CustomerReturnSummary, Error, CreateCustomerReturnInput>({
    mutationKey: ["inventory", "customerReturns", "create"],
    mutationFn: (data) =>
      apiClient.post<CustomerReturnSummary>("/inventory/customer-returns", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.returns.customerList });
    },
  });
}

/**
 * INV-209. The verdict recorded after opening the box, one line at a time —
 * which is how the warehouse works, and why this is not a bulk call.
 */
export function useInspectCustomerReturnLine() {
  const qc = useQueryClient();
  return useMutation<
    { lineId: number; disposition: CustomerReturnDisposition },
    Error,
    InspectReturnLineInput
  >({
    mutationKey: ["inventory", "customerReturns", "inspect"],
    mutationFn: ({ returnId, lineId, disposition, inspectionNotes }) =>
      apiClient.post<{ lineId: number; disposition: CustomerReturnDisposition }>(
        `/inventory/customer-returns/${returnId}/inspect`,
        {
          lineId,
          disposition,
          ...(inspectionNotes !== undefined ? { inspectionNotes } : {}),
        },
      ),
    onSuccess: (_, variables) => invalidateCustomerReturn(qc, variables.returnId),
  });
}

export function useApproveCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<CustomerReturnSummary, Error, ApproveReturnInput>({
    mutationKey: ["inventory", "customerReturns", "approve"],
    mutationFn: ({ returnId, creditReference }) =>
      apiClient.post<CustomerReturnSummary>(
        `/inventory/customer-returns/${returnId}/approve`,
        { ...(creditReference !== undefined ? { creditReference } : {}) },
      ),
    onSuccess: (_, variables) => invalidateCustomerReturn(qc, variables.returnId),
  });
}

export function usePostCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<CustomerReturnSummary, Error, PostReturnInput>({
    mutationKey: ["inventory", "customerReturns", "post"],
    mutationFn: ({ returnId, reason }) =>
      apiClient.post<CustomerReturnSummary>(
        `/inventory/customer-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) },
      ),
    onSuccess: (_, variables) => {
      invalidateCustomerReturn(qc, variables.returnId);
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCancelCustomerReturn() {
  const qc = useQueryClient();
  return useMutation<CustomerReturnSummary, Error, CancelReturnInput>({
    mutationKey: ["inventory", "customerReturns", "cancel"],
    mutationFn: ({ returnId }) =>
      apiClient.post<CustomerReturnSummary>(`/inventory/customer-returns/${returnId}/cancel`, {}),
    onSuccess: (_, variables) => invalidateCustomerReturn(qc, variables.returnId),
  });
}
