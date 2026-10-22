import { queryKeyBase as base, trimKey as k } from "./base";

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
