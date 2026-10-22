import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryPackingQueryKeys = {
  packing: {
    all: [...base, "packing"] as const,
    queueList: [...base, "packing", "queue"] as const,
    queue: (params?: Record<string, unknown>) =>
      k(...base, "packing", "queue", params),
    reconciliation: (packageId: number) =>
      [...base, "packing", "reconciliation", packageId] as const,
  },
} as const;
