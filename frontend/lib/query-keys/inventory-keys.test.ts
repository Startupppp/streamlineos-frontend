import { queryKeys } from "../query-keys";
import { inventoryQueryKeys } from "./inventory";
import { inventoryGenealogyQueryKeys } from "./inventory-genealogy";
import { inventoryPackingQueryKeys } from "./inventory-packing";
import { inventoryPickingQueryKeys } from "./inventory-picking";
import { inventoryPutawayQueryKeys } from "./inventory-putaway";
import { inventoryOpsMetricsQueryKeys } from "./inventory-ops-metrics";
import { inventoryQualityPlanQueryKeys } from "./inventory-quality-plans";
import { inventoryVendorScorecardQueryKeys } from "./inventory-vendor-scorecard";


const NAMESPACES = {
  ...inventoryQueryKeys,
  ...inventoryGenealogyQueryKeys,
  ...inventoryPackingQueryKeys,
  ...inventoryPickingQueryKeys,
  ...inventoryPutawayQueryKeys,
  ...inventoryOpsMetricsQueryKeys,
  ...inventoryQualityPlanQueryKeys,
  ...inventoryVendorScorecardQueryKeys,
} as Record<string, Record<string, unknown>>;

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
