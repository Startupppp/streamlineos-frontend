import { queryKeyBase as base } from "./base";

/**
 * The module's own gauges and the policy rows an operator sets from beside them.
 *
 * Kept apart from `inventory.settings`, which is the settings *document*: a
 * shelf-life floor is a per-customer row rather than a field on that document,
 * and the metrics snapshot is not a setting at all. Sharing a prefix would make
 * saving a checkbox refetch the gauges and vice versa.
 */
export const inventorySystemHealthQueryKeys = {
  inventorySystemHealth: {
    all: [...base, "inventory", "systemHealth"] as const,
    metrics: [...base, "inventory", "systemHealth", "metrics"] as const,
    shelfLifeRules: [...base, "inventory", "systemHealth", "shelfLifeRules"] as const,
  },
} as const;
