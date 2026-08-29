import { queryKeyBase as base } from "./base";

/**
 * D3 — inspection plans.
 *
 * A namespace of its own rather than four more entries on `inventoryQueryKeys`,
 * because that object is under concurrent edit and this is additive: two files,
 * no shared line. The registry merges the domain objects with a **shallow**
 * spread, so a second file that also declared an `inventory` key would replace
 * the first wholesale rather than merge with it — which is why this reads
 * `queryKeys.inspectionPlans.*` and not `queryKeys.inventory.*`.
 *
 * `plansList` is the params-less prefix, and it exists for the same reason
 * `wavesList` and `productsList` do: `plans()` with no argument yields
 * `[..., "plans", undefined]`, and TanStack's partial match compares index 3
 * against a stored params object and never matches — so every no-argument
 * `invalidateQueries({ queryKey: plans() })` would be a silent no-op. Invalidate
 * with `plansList`; read with `plans(params)`.
 */
export const inventoryQualityPlanQueryKeys = {
  inspectionPlans: {
    all: [...base, "inspectionPlans"] as const,
    plansList: [...base, "inspectionPlans", "plans"] as const,
    plans: (params?: Record<string, unknown>) =>
      [...base, "inspectionPlans", "plans", params] as const,
    plan: (planId: number) => [...base, "inspectionPlans", "plan", planId] as const,
    versions: (planId: number) =>
      [...base, "inspectionPlans", "versions", planId] as const,
  },
} as const;
