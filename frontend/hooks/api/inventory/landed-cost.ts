"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useIdempotentMutation } from "./use-idempotent-mutation";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


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
  amountCents: number;
  vendorId?: number;
  reference?: string;
}

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
  [key: string]: unknown;
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
    queryKey: queryKeys.inventoryLandedCost.list(filters),
    queryFn: ({ signal }) => {
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
      }>("/inventory/landed-cost", params, signal);
    },
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useLandedCostVoucher(voucherId: number | null) {
  const canView = useCan("inventory:valuation:read");
  return useQuery<LandedCostVoucherDetail, Error>({
    queryKey: queryKeys.inventoryLandedCost.detail(voucherId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<LandedCostVoucherDetail>(
        `/inventory/landed-cost/${voucherId ?? 0}`,
        undefined,
        signal,
      ),
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
  return useAuthorizedMutation<{ deleted: boolean }, Error, number>(
    "inventory:landed-cost:manage",
    {
      mutationKey: ["inventory", "landed-cost", "delete"],
      mutationFn: (voucherId) =>
        apiClient.delete<{ deleted: boolean }>(`/inventory/landed-cost/${voucherId}`),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.inventoryLandedCost.listAll });
      },
    },
  );
}
