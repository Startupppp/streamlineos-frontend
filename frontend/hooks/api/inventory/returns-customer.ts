"use client";

import { useQuery, useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import {
  CUSTOMER_RETURNS_PERMISSION,
  returnListParams,
  type ApproveReturnInput,
  type CancelReturnInput,
  type CustomerReturnDisposition,
  type CustomerReturnStatus,
  type ListOptions,
  type PaginatedResponse,
  type PostReturnInput,
  type ReturnFilters,
} from "./returns-common";

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
  return useIdempotentMutation<CustomerReturnSummary, Error, CreateCustomerReturnInput>({
    mutationKey: ["inventory", "customerReturns", "create"],
    mutationFn: (data, idempotencyKey) =>
      apiClient.post<CustomerReturnSummary>("/inventory/customer-returns", data, { headers: { "Idempotency-Key": idempotencyKey } }),
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
  return useIdempotentMutation<CustomerReturnSummary, Error, ApproveReturnInput>({
    mutationKey: ["inventory", "customerReturns", "approve"],
    mutationFn: ({ returnId, creditReference }, idempotencyKey) =>
      apiClient.post<CustomerReturnSummary>(
        `/inventory/customer-returns/${returnId}/approve`,
        { ...(creditReference !== undefined ? { creditReference } : {}) }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => invalidateCustomerReturn(qc, variables.returnId),
  });
}

export function usePostCustomerReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<CustomerReturnSummary, Error, PostReturnInput>({
    mutationKey: ["inventory", "customerReturns", "post"],
    mutationFn: ({ returnId, reason }, idempotencyKey) =>
      apiClient.post<CustomerReturnSummary>(
        `/inventory/customer-returns/${returnId}/post`,
        { ...(reason !== undefined ? { reason } : {}) }, { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_, variables) => {
      invalidateCustomerReturn(qc, variables.returnId);
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.stockLevels() });
    },
  });
}

export function useCancelCustomerReturn() {
  const qc = useQueryClient();
  return useIdempotentMutation<CustomerReturnSummary, Error, CancelReturnInput>({
    mutationKey: ["inventory", "customerReturns", "cancel"],
    mutationFn: ({ returnId }, idempotencyKey) =>
      apiClient.post<CustomerReturnSummary>(`/inventory/customer-returns/${returnId}/cancel`, {}, { headers: { "Idempotency-Key": idempotencyKey } }),
    onSuccess: (_, variables) => invalidateCustomerReturn(qc, variables.returnId),
  });
}
