import { queryKeyBase as base, trimKey as k } from "./base";

export const inventoryGenealogyQueryKeys = {
  genealogy: {
    all: [...base, "inventory", "genealogy"] as const,
    graphList: [...base, "inventory", "genealogy", "graph"] as const,
    graph: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "genealogy", "graph", params),
  },
} as const;
