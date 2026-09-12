import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * The GL reconciliation report and the accounting periods it can be scoped to.
 *
 * Separate from `inventory.reconciliation`, which compares the stock projection
 * against the movement ledger. This one compares the movement ledger against
 * the journals, so the two answer different questions and share no invalidation.
 */
export const inventoryGlReconQueryKeys = {
  inventoryGlRecon: {
    all: [...base, "inventory", "glRecon"] as const,
    reportList: [...base, "inventory", "glRecon", "report"] as const,
    report: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "glRecon", "report", params),
    periods: [...base, "inventory", "glRecon", "periods"] as const,
  },
} as const;
