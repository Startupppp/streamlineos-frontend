import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * D1 — the lot/serial genealogy graph.
 *
 * A namespace of its own rather than another entry on `inventoryQueryKeys`,
 * because that object is under concurrent edit and this is additive: two files,
 * no shared line. The registry merges the domain objects with a **shallow**
 * spread, so a second file that also declared an `inventory` key would replace
 * the first wholesale — which is why this reads `queryKeys.genealogy.*` while
 * its array segments still start `["streamlineos", "inventory", …]`, so an
 * inventory-wide prefix invalidation still reaches it.
 *
 * `graphList` is the params-less prefix, for the same reason `productsList`
 * exists: `graph()` with no argument yields `[…, "genealogy", undefined]`, and
 * TanStack's partial match compares index 4 against a stored params object and
 * never matches, so every no-argument `invalidateQueries` would be a silent
 * no-op. Invalidate with `graphList`; read with `graph(params)`.
 */
export const inventoryGenealogyQueryKeys = {
  genealogy: {
    all: [...base, "inventory", "genealogy"] as const,
    graphList: [...base, "inventory", "genealogy", "graph"] as const,
    graph: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "genealogy", "graph", params),
  },
} as const;
