import { queryKeyBase as base, trimKey as k } from "./base";

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
    poBatchPreview: (
      proposalIds: readonly number[],
      overrides?: readonly { proposalId: number; quantity: string }[],
    ) =>
      k(
        ...base,
        "inventory",
        "planning",
        "poBatchPreview",
        [...proposalIds].sort((a, b) => a - b).join(","),
        overrides && overrides.length > 0
          ? [...overrides]
              .sort((a, b) => a.proposalId - b.proposalId)
              .map((o) => `${o.proposalId}:${o.quantity}`)
              .join(",")
          : undefined,
      ),

    driftWatchlistList: [...base, "inventory", "planning", "drift"] as const,
    driftWatchlist: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "drift", params),
    driftDetail: (productVariantId: number, params?: Record<string, unknown>) =>
      k(...base, "inventory", "planning", "driftDetail", productVariantId, params),
  },
} as const;
