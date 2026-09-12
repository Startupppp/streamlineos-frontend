import { queryKeyBase as base } from "./base";

/**
 * B9 — returns.
 *
 * A namespace of its own rather than more entries on `inventoryQueryKeys`,
 * because that object is under concurrent edit and this is additive: two files,
 * no shared line. The registry merges the domain objects with a **shallow**
 * spread, so a second file that also declared an `inventory` key would replace
 * the first wholesale — which is why this reads `queryKeys.returns.*`.
 *
 * The two `*List` entries are the params-less prefixes the existing factories
 * lack. `queryKeys.inventory.customerReturns()` with no argument yields
 * `[…, "customerReturns", undefined]`, and TanStack's partial match walks the
 * *given* key's own indexes — so index 3 compares `undefined` against a stored
 * filter object and never matches. Every no-argument invalidation of the two
 * return lists has therefore been a silent no-op: post a return and the table
 * behind it kept showing DRAFT. These are the same arrays one element shorter,
 * which does match, and they deliberately reuse the existing segment names so a
 * single prefix covers both files' keys.
 */
export const inventoryReturnsQueryKeys = {
  returns: {
    customerList: [...base, "inventory", "customerReturns"] as const,
    vendorList: [...base, "inventory", "vendorReturns"] as const,
  },
} as const;
