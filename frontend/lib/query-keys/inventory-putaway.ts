import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * B3 — putaway tasks.
 *
 * A namespace of its own rather than three more entries on
 * `inventoryQueryKeys`, because that object is under concurrent edit and this is
 * additive: two files, no shared line. The registry merges the domain objects
 * with a **shallow** spread, so a second file that also declared an `inventory`
 * key would replace the first wholesale rather than merge with it — which is
 * why this reads `queryKeys.putaway.*` and not `queryKeys.inventory.*`.
 *
 * `tasksList` is the params-less prefix, and it exists for the same reason
 * `wavesList` does: `tasks()` with no argument yields `[..., "tasks", undefined]`,
 * and TanStack's partial match compares index 3 against a stored params object
 * and never matches — so every no-argument `invalidateQueries({ queryKey: tasks() })`
 * would be a silent no-op. Invalidate with `tasksList`; read with `tasks(params)`.
 */
export const inventoryPutawayQueryKeys = {
  putaway: {
    all: [...base, "putaway"] as const,
    tasksList: [...base, "putaway", "tasks"] as const,
    tasks: (params?: Record<string, unknown>) =>
      k(...base, "putaway", "tasks", params),
    task: (taskId: number) => [...base, "putaway", "task", taskId] as const,
    /**
     * Where the slotting rules would put one quantity of one SKU. Keyed on all
     * three inputs because the ranking changes with every one of them — a
     * suggestion cached against the variant alone would offer a bin that cannot
     * hold the quantity actually being put away.
     */
    suggestions: (warehouseId: number, productVariantId: number, quantity: string) =>
      [...base, "putaway", "suggestions", warehouseId, productVariantId, quantity] as const,
  },
} as const;
