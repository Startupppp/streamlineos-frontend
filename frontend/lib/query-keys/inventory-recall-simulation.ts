import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * D4 — the recall simulator.
 *
 * A namespace of its own rather than four more entries on `inventoryQueryKeys`,
 * because that object is under concurrent edit and this is additive: two files,
 * no shared line. The registry merges the domain objects with a **shallow**
 * spread, so a second file that also declared an `inventory` key would replace
 * the first wholesale rather than merge with it — which is why this reads
 * `queryKeys.recallSimulation.*` and not `queryKeys.inventory.*`.
 *
 * `impactList` is the params-less prefix: `impact()` with no argument yields
 * `[..., "impact", undefined]`, and TanStack's partial match compares that
 * `undefined` against a stored selection object and never matches — so a
 * no-argument `invalidateQueries({ queryKey: impact() })` would be a silent
 * no-op. Invalidate with `impactList`; read with `impact(selection)`.
 */
export const inventoryRecallSimulationQueryKeys = {
  recallSimulation: {
    all: [...base, "recallSimulation"] as const,
    impactList: [...base, "recallSimulation", "impact"] as const,
    impact: (selection?: Record<string, unknown>) =>
      k(...base, "recallSimulation", "impact", selection),
    lotOptions: (params?: Record<string, unknown>) =>
      k(...base, "recallSimulation", "lotOptions", params),
  },
} as const;
