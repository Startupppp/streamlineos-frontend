"use client";

import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import {
  returnListParams,
  type ApproveReturnInput,
  type CancelReturnInput,
  type ListOptions,
  type PaginatedResponse,
  type PostReturnInput,
  type ReturnFilters,
  type VendorReturnReason,
  type VendorReturnStatus,
} from "./returns-common";

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

function invalidateVendorReturn(qc: QueryClient, returnId: number): void {
  void qc.invalidateQueries({ queryKey: queryKeys.returns.vendorList });
  void qc.invalidateQueries({ queryKey: queryKeys.inventory.vendorReturn(returnId) });
}

export function useVendorReturns(
  filters?: ReturnFilters,
  options?: ListOptions<PaginatedResponse<VendorReturnSummary>>,
) {
  const canView = useCan("inventory:vendor-returns:manage");
  return useQuery<PaginatedResponse<VendorReturnSummary>, Error>({
    queryKey: queryKeys.inventory.vendorReturns(filters),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedResponse<VendorReturnSummary>>(
        "/inventory/vendor-returns",
        returnListParams(filters),
        signal,
      ),
    staleTime: 30_000,
    ...options,
    // After the spread, always: re-declaring `enabled` inside it would clobber
    // the permission gate, and declaring it before would let a caller's `false`
    // be overwritten.
    enabled: canView && (options?.enabled ?? true),
  });
}

/**
 * The detail read, mirroring `useCustomerReturn`.
 *
 * `GET /inventory/vendor-returns/:returnId` is still served, and
 * `invalidateVendorReturn` above still invalidates this exact key after every
 * approve, post and cancel — an invalidation with nothing to invalidate is what
 * deleting this hook left behind. It was removed by an AbortSignal sweep that
 * could only ever have asked for the signal to be threaded, as it now is.
 */
export function useVendorReturn(returnId: number | null) {
  const canView = useCan("inventory:vendor-returns:manage");
  return useQuery<VendorReturnSummary, Error>({
    queryKey: queryKeys.inventory.vendorReturn(returnId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}`,
        undefined,
        signal,
      ),
    staleTime: 30_000,
    enabled: canView && returnId !== null,
  });
}

export function useCreateVendorReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<VendorReturnSummary, Error, CreateVendorReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<VendorReturnSummary>("/inventory/vendor-returns", data, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.returns.vendorList });
    },
  });
}

export function useApproveVendorReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<VendorReturnSummary, Error, ApproveReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "approve"],
    mutationFn: ({ returnId, creditReference }, idempotencyKey) =>
      apiClient.post<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}/approve`,
        { ...(creditReference !== undefined ? { creditReference } : {}) }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => invalidateVendorReturn(qc, variables.returnId),
  });
}

export function usePostVendorReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<VendorReturnSummary, Error, PostReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "post"],
    mutationFn: ({ returnId, reason }, idempotencyKey) =>
      apiClient.post<VendorReturnSummary>(
        `/inventory/vendor-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => {
      invalidateVendorReturn(qc, variables.returnId);
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCancelVendorReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<VendorReturnSummary, Error, CancelReturnInput>({
    mutationKey: ["inventory", "vendorReturns", "cancel"],
    mutationFn: ({ returnId }, idempotencyKey) =>
      apiClient.post<VendorReturnSummary>(`/inventory/vendor-returns/${returnId}/cancel`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, variables) => invalidateVendorReturn(qc, variables.returnId),
  });
}
