import { queryKeyBase as base } from "./base";

/**
 * B4 — pick waves.
 *
 * A namespace of its own rather than three more entries on
 * `inventoryQueryKeys`, because that object is under concurrent edit and this
 * is additive: two files, no shared line. The registry merges the domain
 * objects with a **shallow** spread, so a second file that also declared an
 * `inventory` key would replace the first wholesale rather than merge with it —
 * which is why this reads `queryKeys.picking.*` and not `queryKeys.inventory.*`.
 *
 * `wavesList` is the params-less prefix, and it exists for the same reason
 * `productsList` does: `waves()` with no argument yields
 * `[..., "waves", undefined]`, and TanStack's partial match compares index 3
 * against a stored params object and never matches — so every no-argument
 * `invalidateQueries({ queryKey: waves() })` would be a silent no-op. Invalidate
 * with `wavesList`; read with `waves(params)`.
 */
export const inventoryPickingQueryKeys = {
  picking: {
    all: [...base, "picking"] as const,
    wavesList: [...base, "picking", "waves"] as const,
    waves: (params?: Record<string, unknown>) =>
      [...base, "picking", "waves", params] as const,
    wave: (pickListId: number) => [...base, "picking", "wave", pickListId] as const,
    /**
     * B5 — the supervisor queue. `exceptionsList` is the params-less prefix, for
     * the same reason `wavesList` is: `exceptions()` with no argument yields a
     * key ending in `undefined`, which TanStack's partial match compares against
     * a stored params object and never matches, so every no-argument invalidate
     * would be a silent no-op.
     */
    exceptionsList: [...base, "picking", "exceptions"] as const,
    exceptions: (params?: Record<string, unknown>) =>
      [...base, "picking", "exceptions", params] as const,
  },
} as const;
