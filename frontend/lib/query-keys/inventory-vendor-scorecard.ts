import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * C4 — the supplier scorecard and the deliveries behind it.
 *
 * A namespace of its own rather than two more entries on `inventoryQueryKeys`,
 * for the reason `inventory-picking.ts` gives: that object is under concurrent
 * edit and this is purely additive. The registry merges the domain objects with
 * a **shallow** spread, so a second file declaring an `inventory` key would
 * replace the first wholesale — which is why this reads
 * `queryKeys.vendorScorecard.*`.
 *
 * `deliveriesList` is the params-less prefix. `deliveries()` with no argument
 * yields `[..., "deliveries", vendorId, undefined]`, and TanStack's partial
 * match compares the trailing params object and never matches, so a
 * no-argument invalidate would be a silent no-op. Invalidate with
 * `deliveriesList`; read with `deliveries(vendorId, params)`.
 */
export const inventoryVendorScorecardQueryKeys = {
  vendorScorecard: {
    all: [...base, "inventory", "vendorScorecard"] as const,
    card: (vendorId: number) =>
      [...base, "inventory", "vendorScorecard", "card", vendorId] as const,
    deliveriesList: [...base, "inventory", "vendorScorecard", "deliveries"] as const,
    deliveries: (vendorId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "vendorScorecard", "deliveries", vendorId, params),
  },
} as const;
