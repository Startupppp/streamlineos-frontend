import { queryKeyBase as base, trimKey as k } from "./base";

/**
 * B10 — operations throughput and SLA.
 *
 * A namespace of its own rather than another entry on `inventoryQueryKeys`,
 * which is under concurrent edit; the registry merges the domain objects with a
 * **shallow** spread, so a second file declaring an `inventory` key would
 * replace the first wholesale rather than merge with it. Hence
 * `queryKeys.inventoryOps.*`.
 *
 * `throughputAll` is the params-less prefix, for the same reason every other
 * list here has one: `throughput()` with no argument would yield a key ending in
 * `undefined`, which TanStack's partial match compares against a stored params
 * object and never matches, making every no-argument invalidate a silent no-op.
 */
export const inventoryOpsMetricsQueryKeys = {
  inventoryOps: {
    all: [...base, "inventoryOps"] as const,
    throughputAll: [...base, "inventoryOps", "throughput"] as const,
    throughput: (params?: Record<string, unknown>) =>
      k(...base, "inventoryOps", "throughput", params),
  },
} as const;
