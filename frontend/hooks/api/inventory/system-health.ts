"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

/**
 * The gauges that say whether the module is healthy, and the two switches that
 * act on what they report.
 *
 * `GET /inventory/metrics` sits behind `inventory:settings:manage` rather than a
 * report key on purpose: these are numbers about the *system*, and "orphaned
 * reservations" reads as alarming to somebody who only wanted a stock report.
 * All three routes were mounted and none was called, so a dead outbox, a
 * negative stock level and an expiry sweep that had never run were all invisible.
 */

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
    queryFn: () => apiClient.get<InventoryMetricsSnapshot>("/inventory/metrics"),
    // Gauges an operator watches while they fix something. Cheap by design —
    // one round trip for every gauge — so it is safe to keep this short.
    staleTime: 15_000,
    enabled: canView,
  });
}

/**
 * Sweeps the caller's organisation and nobody else's.
 *
 * The route is not idempotency-fenced and does not need to be: a second sweep
 * over the same lots emits nothing new, because the sweep is keyed on what has
 * not been notified yet rather than on the request.
 */
export function useRunExpirySweep() {
  const qc = useQueryClient();
  return useMutation<{ events: number }, Error, void>({
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

/**
 * The remaining-life floor an allocation has to clear.
 *
 * A stored setting with no writer is a dead switch: FEFO allocation reads these
 * rows on every pick, and until now nothing in the product could create one, so
 * the floor was permanently whatever the database happened to hold. A row with a
 * null customer is the default for the whole organisation; a row with a customer
 * is that customer's negotiated floor.
 */
export function useShelfLifeRules() {
  const canManage = useCan("inventory:settings:manage");
  return useQuery<ShelfLifeRule[], Error>({
    queryKey: queryKeys.inventorySystemHealth.shelfLifeRules,
    queryFn: () => apiClient.get<ShelfLifeRule[]>("/inventory/settings/shelf-life-rules"),
    staleTime: 5 * 60_000,
    enabled: canManage,
  });
}

export function usePutShelfLifeRule() {
  const qc = useQueryClient();
  return useMutation<ShelfLifeRule, Error, PutShelfLifeRuleInput>({
    mutationKey: ["inventory", "settings", "shelf-life-rule", "put"],
    mutationFn: (input) =>
      apiClient.put<ShelfLifeRule>("/inventory/settings/shelf-life-rules", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.inventorySystemHealth.shelfLifeRules });
    },
  });
}
