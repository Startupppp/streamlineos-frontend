import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryTransitQueryKeys = {
  inventoryTransit: {
    all: [...base, "inventory", "transit"] as const,
    strandedList: [...base, "inventory", "transit", "stranded"] as const,
    stranded: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "transit", "stranded", params),
  },
} as const;
