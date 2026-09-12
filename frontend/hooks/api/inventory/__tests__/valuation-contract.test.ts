import {
  costingVariantsContract,
  valuationReportContract,
} from "@/hooks/api/inventory/valuation-schema";

/**
 * `GET /inventory/reports/valuation` reads the canonical valuation service, so
 * it answers `{ grain, items, totalValue, totalOnHand, total, page, totalPages }`
 * with every quantity and money figure a `numeric(18,4)` text column — in the
 * organisation's own currency, not minor units. The screen used to expect
 * `{ rows, byMethod, totalValue }` of numbers and divide each by 100, which
 * reported a hundredth of the stock value.
 *
 * `GET /inventory/products/variants` is the costing table's source and answers
 * the catalogue row: no costing method, no average cost, no on-hand.
 */

it("accepts the valuation summary the backend builds", () => {
  const parsed = valuationReportContract.parse({
    grain: { asOfDate: "2026-09-10", live: true, period: null },
    items: [
      {
        productVariantId: 7,
        variantSku: "SKU-7",
        variantName: null,
        productId: 3,
        productName: "Copper wire 2.5mm",
        costingMethod: "FIFO",
        onHand: "40.0000",
        value: "9876.0000",
        fifoValue: "9876.0000",
        standardCost: "0",
        unitCostBasis: "246.9000",
        layerCount: 2,
      },
    ],
    totalValue: "9876.0000",
    totalOnHand: "40.0000",
    total: 1,
    page: 1,
    totalPages: 1,
  });

  expect(parsed.items[0]?.value).toBe("9876.0000");
  expect(parsed.grain.live).toBe(true);
});

it("rejects the flat numeric report the screen used to divide by 100", () => {
  const flat = {
    totalValue: 987600,
    byMethod: [{ method: "FIFO", value: 987600 }],
    rows: [
      {
        variantId: 7,
        variantSku: "SKU-7",
        productName: "Copper wire 2.5mm",
        costingMethod: "FIFO",
        onHandQty: 40,
        unitCostBasis: 2469,
        totalValue: 987600,
        warehouseId: 1,
        warehouseName: "Pune DC",
      },
    ],
  };

  expect(valuationReportContract.safeParse(flat).success).toBe(false);
});

it("accepts the variant page the costing table reads", () => {
  const parsed = costingVariantsContract.parse({
    items: [
      {
        id: 7,
        productId: 3,
        productName: "Copper wire 2.5mm",
        name: "2.5mm reel",
        sku: "SKU-7",
        costPrice: "246.9000",
        isActive: true,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });

  expect(parsed.items[0]?.costPrice).toBe("246.9000");
  expect(parsed.pageSize).toBe(20);
});

it("rejects the costing row the screen invented", () => {
  const invented = {
    items: [
      {
        variantId: 7,
        variantSku: "SKU-7",
        productName: "Copper wire 2.5mm",
        costingMethod: "FIFO",
        standardCost: 100,
        averageCost: 90,
        onHandQty: 40,
        isLocked: true,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  };

  expect(costingVariantsContract.safeParse(invented).success).toBe(false);
});
