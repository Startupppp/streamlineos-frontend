"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type ReconciliationCheck =
  | "projection_vs_ledger"
  | "committed_vs_reservations"
  | "ledger_arithmetic"
  | "orphan_projection";

export interface ReconciliationDriftRow {
  check: ReconciliationCheck;
  stockLevelId: number | null;
  productVariantId: number;
  locationId: number | null;
  lotId: number | null;
  serialId: number | null;
  field: string;
  projected: string;
  expected: string;
  difference: string;
}

export interface ReconciliationReport {
  generatedAt: string;
  scope: {
    warehouseKey: string;
    warehouseId: number | null;
    productVariantId: number | null;
  };
  checked: ReconciliationCheck[];
  /**
   * Figures the report deliberately does not claim to check, with the reason.
   * on_order and outgoing_qty come from open documents and are not ledgerised.
   */
  unreconcilable: string[];
  drift: ReconciliationDriftRow[];
  driftCount: number;
  truncated: boolean;
}

export interface RepairResult {
  applied: boolean;
  rowsChanged: number;
  preview: ReconciliationReport | null;
}

export interface ReconciliationParams {
  warehouseId?: number;
  productVariantId?: number;
  limit?: number;
}

export function useReconciliationReport(params?: ReconciliationParams) {
  const canReconcile = useCan("inventory:stock:reconcile");
  return useQuery<ReconciliationReport, Error>({
    queryKey: queryKeys.inventory.reconciliation({ ...params }),
    queryFn: () =>
      apiClient.get<ReconciliationReport>("/inventory/stock/reconciliation", {
        warehouseId: params?.warehouseId,
        productVariantId: params?.productVariantId,
        limit: params?.limit,
      }),
    // Drift is a point-in-time comparison against a moving ledger, so a cached
    // answer is worse than no answer — the operator has to know when it was taken.
    staleTime: 0,
    enabled: canReconcile,
  });
}

export function useRepairProjection() {
  const queryClient = useQueryClient();
  return useMutation<RepairResult, Error, { reason: string; warehouseId?: number; productVariantId?: number }>({
    mutationKey: ["inventory", "reconciliation", "repair"],
    mutationFn: (input) =>
      apiClient.post<RepairResult>(
        "/inventory/stock/reconciliation/repair",
        { apply: true, ...input },
        // The command is retry-safe on the server; the key `apiClient` mints is
        // what makes a retried request replay its first result instead of
        // reporting a second set of changed rows.
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
    },
  });
}
