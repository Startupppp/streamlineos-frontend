import { queryKeyBase as base } from "./base";

/**
 * B6 — the packing bench.
 *
 * A namespace of its own rather than more entries on `inventoryQueryKeys`,
 * because that object is under concurrent edit and this is additive: two files,
 * no shared line. The registry merges the domain objects with a **shallow**
 * spread, so a second file that also declared an `inventory` key would replace
 * the first wholesale rather than merge with it — which is why this reads
 * `queryKeys.packing.*` and not `queryKeys.inventory.*`.
 *
 * `queueList` is the params-less prefix and it exists for the same reason
 * `inventoryPickingQueryKeys.wavesList` does: `queue()` with no argument yields
 * `[..., "queue", undefined]`, and TanStack's partial match compares index 3
 * against a stored params object and never matches — so every no-argument
 * `invalidateQueries({ queryKey: queue() })` would be a silent no-op.
 * Invalidate with `queueList`; read with `queue(params)`.
 */
export const inventoryPackingQueryKeys = {
  packing: {
    all: [...base, "packing"] as const,
    queueList: [...base, "packing", "queue"] as const,
    queue: (params?: Record<string, unknown>) =>
      [...base, "packing", "queue", params] as const,
    reconciliation: (packageId: number) =>
      [...base, "packing", "reconciliation", packageId] as const,
  },
} as const;
