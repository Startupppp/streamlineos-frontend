import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * The in-transit queue, which is its own namespace rather than a member of
 * `inventory.transfers`.
 *
 * A stranded row is keyed on the transfer *line*, and it changes when a
 * completely different command runs — a short receipt strands units without
 * touching the transfer list's own shape. Nesting it under `transfers` would
 * make every transfer-list invalidation refetch the queue and, worse, make an
 * exit that changes only the queue look like it changed nothing.
 */
export const inventoryTransitQueryKeys = {
  inventoryTransit: {
    all: [...base, "inventory", "transit"] as const,
    strandedList: [...base, "inventory", "transit", "stranded"] as const,
    stranded: (params?: Record<string, unknown>) =>
      k(...base, "inventory", "transit", "stranded", params),
  },
} as const;
