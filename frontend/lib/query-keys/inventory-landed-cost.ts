import { queryKeyBase as base, trimKey as k } from "./base";

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
