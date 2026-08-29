import { queryKeys } from "../query-keys";
import { inventoryQueryKeys } from "./inventory";
import { inventoryGenealogyQueryKeys } from "./inventory-genealogy";
import { inventoryPackingQueryKeys } from "./inventory-packing";
import { inventoryPickingQueryKeys } from "./inventory-picking";
import { inventoryPutawayQueryKeys } from "./inventory-putaway";
import { inventoryQualityPlanQueryKeys } from "./inventory-quality-plans";
import { inventoryVendorScorecardQueryKeys } from "./inventory-vendor-scorecard";

/**
 * R2 — the invalidation keys have to be able to match.
 *
 * A no-argument factory call is what ~110 mutation handlers pass to
 * `invalidateQueries`. If it ends in `undefined`, TanStack compares that slot
 * against the stored params object and never matches, and the invalidation is a
 * silent no-op: post a receipt and the list behind it keeps the old row. This
 * walks every inventory key namespace and calls every factory with no argument,
 * so a new factory written the old way fails here rather than in production.
 */

const NAMESPACES = {
  ...inventoryQueryKeys,
  ...inventoryGenealogyQueryKeys,
  ...inventoryPackingQueryKeys,
  ...inventoryPickingQueryKeys,
  ...inventoryPutawayQueryKeys,
  ...inventoryQualityPlanQueryKeys,
  ...inventoryVendorScorecardQueryKeys,
} as Record<string, Record<string, unknown>>;

/** Factories whose first argument is a required id — a no-arg call is not a real key. */
function callableWithNoArgs(fn: (...args: never[]) => unknown): boolean {
  return fn.length === 0;
}

describe("inventory query keys", () => {
  it("never produces a key containing undefined", () => {
    const offenders: string[] = [];

    for (const [namespace, entries] of Object.entries(NAMESPACES)) {
      for (const [name, value] of Object.entries(entries)) {
        const key =
          typeof value === "function"
            ? callableWithNoArgs(value as (...args: never[]) => unknown)
              ? (value as () => unknown)()
              : undefined
            : value;
        if (!Array.isArray(key)) continue;
        if (key.some((segment) => segment === undefined)) {
          offenders.push(`${namespace}.${name} → ${JSON.stringify(key)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("a params-less call is a prefix of the same list read with params", () => {
    const prefix = queryKeys.inventory.products();
    const filtered = queryKeys.inventory.products({ status: "ACTIVE", page: 2 });

    expect(filtered.slice(0, prefix.length)).toEqual(prefix);
    expect(prefix).toEqual(queryKeys.inventory.productsList);
  });

  it("trims an omitted optional argument that is not the params object", () => {
    expect(queryKeys.inventory.availability(7)).toEqual([
      "streamlineos",
      "inventory",
      "availability",
      7,
    ]);
    expect(queryKeys.inventory.availability(7, 3)).toEqual([
      "streamlineos",
      "inventory",
      "availability",
      7,
      3,
    ]);
  });

  it("keeps the detail-key shapes the registry test pins", () => {
    expect(queryKeys.inventory.purchaseOrder(89)).toEqual([
      "streamlineos",
      "inventory",
      "purchaseOrder",
      89,
    ]);
  });
});
