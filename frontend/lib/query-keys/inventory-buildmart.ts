import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * B2/B1 — the operations board and construction projects.
 *
 * Its own namespace rather than another entry on `inventoryQueryKeys`, for the
 * reason `inventory-ops-metrics.ts` gives: the registry merges these objects
 * with a **shallow** spread, so a second file declaring an `inventory` key
 * replaces the first wholesale instead of merging with it.
 *
 * Every list has a params-less prefix beside it. `projects()` with no argument
 * would yield a key ending in `undefined`, which TanStack compares against a
 * stored params object and never matches — making every no-argument invalidate
 * a silent no-op, which reads as "the list did not refresh after I saved".
 */
export const inventoryBuildmartQueryKeys = {
  inventoryOpsBoard: {
    all: [...base, "inventoryOpsBoard"] as const,
    summary: [...base, "inventoryOpsBoard", "summary"] as const,
    attention: [...base, "inventoryOpsBoard", "attention"] as const,
    zones: [...base, "inventoryOpsBoard", "zones"] as const,
  },
  inventoryProjects: {
    all: [...base, "inventoryProjects"] as const,
    listAll: [...base, "inventoryProjects", "list"] as const,
    list: (params?: Record<string, unknown>) => k(...base, "inventoryProjects", "list", params),
    detail: (projectId: number) => [...base, "inventoryProjects", "detail", projectId] as const,
    atRisk: [...base, "inventoryProjects", "atRisk"] as const,
  },
} as const;
