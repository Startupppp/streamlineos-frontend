import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * Landed-cost vouchers.
 *
 * Its own namespace rather than a member of `inventory.valuation`: applying a
 * voucher changes valuation, so the mutation invalidates both — but reading the
 * voucher list must not refetch the valuation report, which is a far heavier
 * query over the whole catalogue.
 */
export const inventoryLandedCostQueryKeys = {
  inventoryLandedCost: {
    all: [...base, "inventory", "landedCost"] as const,
    listAll: [...base, "inventory", "landedCost", "list"] as const,
    list: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "landedCost", "list", params),
    detail: (voucherId: number) =>
      [...base, "inventory", "landedCost", "detail", voucherId] as const,
  },
} as const;
