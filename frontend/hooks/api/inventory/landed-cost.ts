"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * Freight, duty, insurance and handling, landed into the cost layers of the
 * receipt that brought the goods in.
 *
 * Six routes, none of them called from this repo — so a whole document type
 * existed on the backend, with its own permission key and its own backfill
 * migration, and no way to raise one.
 *
 * Reads are gated on `inventory:valuation:read`, because a voucher discloses
 * what stock cost and supplier freight is commercially sensitive. Writes carry
 * `inventory:landed-cost:manage` rather than a receiving key: applying a voucher
 * restates what inventory is worth and posts to the ledger, which is not the
 * same authority as signing for a pallet.
 */

export const LANDED_COST_CHARGE_TYPES = [
  "FREIGHT",
  "DUTY",
  "INSURANCE",
  "HANDLING",
  "OTHER",
] as const;
export type LandedCostChargeType = (typeof LANDED_COST_CHARGE_TYPES)[number];

export type LandedCostStatus = "DRAFT" | "APPLIED";
export type LandedCostBasis = "VALUE" | "QUANTITY";

export interface LandedCostVoucherListItem {
  id: number;
  voucherNumber: string;
  grnId: number;
  status: LandedCostStatus;
  allocationBasis: LandedCostBasis;
  currency: string;
  /** Integer minor units as a string: this number becomes both a debit and a credit. */
  chargeTotalCents: string;
  capitalisedValue: string | null;
  expensedValue: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export interface LandedCostCharge {
  id: number;
  chargeType: LandedCostChargeType;
  description: string;
  amountCents: string;
  vendorId: number | null;
  reference: string | null;
}

export interface LandedCostAllocation {
  valuationLayerId: number;
  productVariantId: number;
  costingMethod: string;
  weight: string;
  allocatedValue: string;
  capitalisedValue: string;
  expensedValue: string;
  layerQuantity: string;
  remainingQuantity: string;
  unitCostBefore: string;
  unitCostAfter: string;
}

export interface LandedCostVoucherDetail extends LandedCostVoucherListItem {
  notes: string | null;
  /** The same total at the grain the cost layers are kept in. */
  chargeTotal: string;
  charges: LandedCostCharge[];
  allocations: LandedCostAllocation[];
}

export interface CreateLandedCostVoucherInput {
  grnId: number;
  allocationBasis: LandedCostBasis;
  currency: string;
  notes?: string;
  charges: Array<{
    chargeType: LandedCostChargeType;
    description: string;
    amountCents: number;
    vendorId?: number;
    reference?: string;
  }>;
}

export interface AddLandedCostChargeInput {
  voucherId: number;
  chargeType: LandedCostChargeType;
  description: string;
  /** Integer minor units, always positive — the backend refuses a fraction. */
  amountCents: number;
  vendorId?: number;
  reference?: string;
}

/**
 * The route answers with the voucher's new total, not the voucher.
 *
 * It was typed as `LandedCostVoucherDetail`, which nothing noticed because
 * nothing called it: a caller reading `.charges` off the result would have got
 * `undefined` at runtime with the type saying otherwise. The detail query is
 * invalidated below, so the rest of the voucher comes back the honest way.
 */
export interface AddLandedCostChargeResult {
  voucherId: number;
  chargeTotalCents: string;
}

export interface LandedCostApplyResult {
  voucherId: number;
  status: "APPLIED";
  chargeTotal: string;
  capitalisedValue: string;
  expensedValue: string;
  layersRevalued: number;
}

export interface LandedCostFilters {
  grnId?: number;
  status?: LandedCostStatus;
  page?: number;
  limit?: number;
}

export function useLandedCostVouchers(filters?: LandedCostFilters) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<
    { items: LandedCostVoucherListItem[]; total: number; page: number; totalPages: number },
    Error
  >({
    queryKey: queryKeys.inventoryLandedCost.list(filters as Record<string, unknown>),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters?.grnId) params.grnId = String(filters.grnId);
      if (filters?.status) params.status = filters.status;
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      return apiClient.get<{
        items: LandedCostVoucherListItem[];
        total: number;
        page: number;
        totalPages: number;
      }>("/inventory/landed-cost", params);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useLandedCostVoucher(voucherId: number | null) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<LandedCostVoucherDetail, Error>({
    queryKey: queryKeys.inventoryLandedCost.detail(voucherId ?? 0),
    queryFn: () =>
      apiClient.get<LandedCostVoucherDetail>(`/inventory/landed-cost/${voucherId ?? 0}`),
    staleTime: 60_000,
    enabled: canView && voucherId !== null,
  });
}

export function useCreateLandedCostVoucher() {
  const qc = useQueryClient();
  return useIdempotentMutation<LandedCostVoucherDetail, Error, CreateLandedCostVoucherInput>({
    mutationKey: ["inventory", "landed-cost", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<LandedCostVoucherDetail>("/inventory/landed-cost", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.listAll });
    },
  });
}

export function useAddLandedCostCharge() {
  const qc = useQueryClient();
  return useIdempotentMutation<AddLandedCostChargeResult, Error, AddLandedCostChargeInput>({
    mutationKey: ["inventory", "landed-cost", "charge", "add"],
    mutationFn: ({ voucherId, ...charge }, idempotencyKey) =>
      apiClient.post<AddLandedCostChargeResult>(
        `/inventory/landed-cost/${voucherId}/charges`,
        charge,
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, variables) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.listAll });
      void qc.invalidateQueries({
        queryKey: queryKeys.inventoryLandedCost.detail(variables.voucherId),
      });
    },
  });
}

/**
 * The only route here that moves money.
 *
 * Keyed per intent: a retried apply that ran twice would put the freight into
 * the cost layers twice, and there is no movement to reverse it with.
 */
export function useApplyLandedCostVoucher() {
  const qc = useQueryClient();
  return useIdempotentMutation<LandedCostApplyResult, Error, number>({
    mutationKey: ["inventory", "landed-cost", "apply"],
    mutationFn: (voucherId, idempotencyKey) =>
      apiClient.post<LandedCostApplyResult>(
        `/inventory/landed-cost/${voucherId}/apply`,
        {},
        { headers: { "Idempotency-Key": idempotencyKey } },
      ),
    onSuccess: (_result, voucherId) => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.listAll });
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.detail(voucherId) });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.valuationReportList });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.valuationLayersList });
    },
  });
}

export function useDeleteLandedCostVoucher() {
  const qc = useQueryClient();
  return useMutation<{ deleted: boolean }, Error, number>({
    mutationKey: ["inventory", "landed-cost", "delete"],
    mutationFn: (voucherId) =>
      apiClient.delete<{ deleted: boolean }>(`/inventory/landed-cost/${voucherId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.listAll });
    },
  });
}
