"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


export interface InventoryMetricsSnapshot {
  invariants: { negativeLevels: number; orphanedReservations: number };
  ageing: { oldestActiveReservationHours: number | null; expiredUnreleasedReservations: number };
  outbox: { pending: number; dead: number; lagSeconds: number | null };
  imports: { failedJobs: number };
  counters: Record<string, number>;
  countersNote: string;
}

export function useInventoryMetrics() {
  const canView = useCan("inventory:settings:manage");
  return useQuery<InventoryMetricsSnapshot, Error>({
    queryKey: queryKeys.inventorySystemHealth.metrics,
    queryFn: ({ signal }) =>
      apiClient.get<InventoryMetricsSnapshot>("/inventory/metrics", undefined, signal),
    staleTime: 15_000,
    enabled: canView,
  });
}

export function useRunExpirySweep() {
  const qc = useQueryClient();
  return useAuthorizedMutation<{ events: number }, Error, void>("inventory:settings:manage", {
    mutationKey: ["inventory", "maintenance", "expiry-sweep"],
    mutationFn: () => apiClient.post<{ events: number }>("/inventory/maintenance/expiry-sweep", {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventorySystemHealth.metrics });
      void qc.invalidateQueries({ queryKey: queryKeys.inventory.expiryList });
    },
  });
}

export interface ShelfLifeRule {
  id: number;
  clientId: number | null;
  clientName: string | null;
  minShelfLifeDays: number;
  notes: string | null;
  updatedAt: string;
}

export interface PutShelfLifeRuleInput {
  clientId?: number | null;
  minShelfLifeDays: number;
  notes?: string | null;
}

export function useShelfLifeRules() {
  const canManage = useCan("inventory:settings:manage");
  return useQuery<ShelfLifeRule[], Error>({
    queryKey: queryKeys.inventorySystemHealth.shelfLifeRules,
    queryFn: ({ signal }) =>
      apiClient.get<ShelfLifeRule[]>("/inventory/settings/shelf-life-rules", undefined, signal),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function usePutShelfLifeRule() {
  const qc = useQueryClient();
  return useAuthorizedMutation<ShelfLifeRule, Error, PutShelfLifeRuleInput>(
    "inventory:settings:manage",
    {
      mutationKey: ["inventory", "settings", "shelf-life-rule", "put"],
      mutationFn: (input) =>
        apiClient.put<ShelfLifeRule>("/inventory/settings/shelf-life-rules", input),
      onSuccess: () => {
        void qc.invalidateQueries({ queryKey: queryKeys.inventorySystemHealth.shelfLifeRules });
      },
    },
  );
}
