import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * C5/C6/C7 — transfer recommendations, purchase-order batching and forecast
 * drift.
 *
 * A namespace of its own rather than three more entries on
 * `inventoryQueryKeys`, for the reason `inventory-picking.ts` gives: that object
 * is under concurrent edit and this is purely additive. The registry merges the
 * domain objects with a **shallow** spread, so a second file declaring an
 * `inventory` key would replace the first wholesale — which is why this reads
 * `queryKeys.inventoryPlanning.*`.
 *
 * Each list carries a params-less prefix beside its factory. `driftWatchlist()`
 * with no argument yields `[..., "drift", undefined]`, and TanStack's partial
 * match compares the trailing params object and never matches, so a
 * no-argument invalidate would be a silent no-op. Invalidate with the `*List`
 * prefix; read with the factory.
 */
export const inventoryPlanningQueryKeys = {
  inventoryPlanning: {
    all: [...base, "inventory", "planning"] as const,

    transferPlanList: [...base, "inventory", "planning", "transferPlan"] as const,
    transferPlan: (productVariantId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "transferPlan", productVariantId, params),

    batchableProposalsList: [...base, "inventory", "planning", "batchableProposals"] as const,
    batchableProposals: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "batchableProposals", params),

    poBatchPreviewList: [...base, "inventory", "planning", "poBatchPreview"] as const,
    poBatchPreview: (proposalIds: readonly number[]) =>
      [
        ...base,
        "inventory",
        "planning",
        "poBatchPreview",
        [...proposalIds].sort((a, b) => a - b).join(","),
      ] as const,

    driftWatchlistList: [...base, "inventory", "planning", "drift"] as const,
    driftWatchlist: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "drift", params),
    driftDetail: (productVariantId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "driftDetail", productVariantId, params),
  },
} as const;
