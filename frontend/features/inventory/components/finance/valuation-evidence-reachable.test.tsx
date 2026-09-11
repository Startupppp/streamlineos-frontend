import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ValuationClient } from "./valuation-client";

/**
 * `GET /inventory/valuation/consumptions` and `GET /inventory/valuation/periods`
 * were permissioned on `inventory:valuation:read` — the key the valuation screen
 * already holds — and called by nothing. The drill-down stopped at the receipt,
 * so a valuation figure could be opened but a cost of goods sold figure could
 * not: nothing on screen said which layer an issue drew from, or at what cost.
 *
 * The same sheet's Layers tab was reading a contract the backend does not send.
 * It asked for `id` / `qty` / `remainingQty` / `receivedAt` against a response
 * carrying `layerId` / `quantity` / `remainingQuantityAsAt` / `createdAt`, and
 * ran the unit cost through a `/100` that belongs to a different endpoint's
 * minor units. Every cell was `undefined` and every figure was a hundredth of
 * itself; the tests below pin both halves to the real payload.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/valuation",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/org-display", () => ({
  useOrgDisplay: () => ({ currency: "INR", locale: "en-IN" }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: [] }),
}));

const idle = { isLoading: false, isError: false, error: null, refetch: jest.fn() };

jest.mock("@/hooks/api/inventory/valuation", () => ({
  useValuationReport: () => ({
    ...idle,
    data: {
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
    },
  }),
  useValuationLayers: () => ({
    ...idle,
    data: {
      grain: { asOfDate: "2026-09-10", live: true, period: null },
      items: [
        {
          layerId: 501,
          createdAt: "2026-08-14T06:00:00.000Z",
          stockTransactionId: 9001,
          costingMethod: "FIFO",
          sourceType: "GOODS_RECEIPT",
          sourceId: "GR-31",
          locationId: 4,
          locationName: "A-01",
          warehouseName: "Pune DC",
          lotId: null,
          lotNumber: null,
          quantity: "100.0000",
          unitCost: "31.2500",
          totalValue: "3125.0000",
          remainingQuantity: "40.0000",
          remainingValue: "1250.0000",
          consumedQuantity: "60.0000",
          consumptionCount: 2,
          remainingQuantityAsAt: "40.0000",
          remainingValueAsAt: "1250.0000",
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    },
  }),
  useValuationPeriods: () => ({
    ...idle,
    data: {
      installed: true,
      items: [
        {
          periodId: "0b8f6a52-4c1e-4b8e-9d6f-2a7c3e5f1a90",
          name: "September 2026",
          startDate: "2026-09-01",
          endDate: "2026-09-30",
          status: "OPEN",
        },
      ],
    },
  }),
  useValuationConsumptions: () => ({
    ...idle,
    data: {
      window: { fromDate: "2026-09-01", toDate: "2026-09-10", period: null },
      items: [
        {
          consumptionId: 88,
          createdAt: "2026-09-01T04:00:00.000Z",
          stockTransactionId: 9100,
          valuationLayerId: 501,
          quantity: "60.0000",
          unitCost: "31.2500",
          totalCost: "1875.0000",
          layerUnitCost: "31.2500",
          layerCreatedAt: "2026-08-14T06:00:00.000Z",
          layerSourceType: "GOODS_RECEIPT",
          layerSourceId: "GR-31",
          costingMethod: "FIFO",
          productVariantId: 7,
          transactionType: "SALE",
          referenceType: "SALES_ORDER",
          referenceId: "SO-204",
          postingDate: "2026-09-01",
          variantSku: "SKU-7",
          productName: "Copper wire 2.5mm",
          locationName: "A-01",
        },
      ],
      total: 1,
      page: 1,
      totalPages: 1,
    },
  }),
}));

async function openEvidenceSheet(): Promise<void> {
  renderWithProviders(
    <TooltipProvider>
      <ValuationClient />
    </TooltipProvider>,
  );
  await userEvent.click(await screen.findByRole("button", { name: /layers/i }));
}

it("reaches the consumption evidence from the valuation row a finance reader opens", async () => {
  await openEvidenceSheet();

  expect(await screen.findByRole("tab", { name: /consumption/i })).toBeInTheDocument();
});

it("names the layer each issue drew from, and what the draw cost", async () => {
  await openEvidenceSheet();
  await userEvent.click(await screen.findByRole("tab", { name: /consumption/i }));

  expect(await screen.findByText("#501")).toBeInTheDocument();
  expect(screen.getByText("SALES_ORDER SO-204")).toBeInTheDocument();
  expect(screen.getByText("₹1,875.00")).toBeInTheDocument();
});

/**
 * `postingDate` arrives as a bare `2026-09-01`. Read with `new Date` that is UTC
 * midnight, which renders as 31 August for every reader west of UTC — so this
 * assertion is what fails if `formatCalendarDate` ever goes back to `new Date`.
 */
it("renders a bare posting date as the day it was posted", async () => {
  await openEvidenceSheet();
  await userEvent.click(await screen.findByRole("tab", { name: /consumption/i }));

  expect(await screen.findByText("1 Sep 2026")).toBeInTheDocument();
});

it("offers the accounting periods a consumption window can be quoted against", async () => {
  await openEvidenceSheet();
  await userEvent.click(await screen.findByRole("tab", { name: /consumption/i }));

  expect(await screen.findByRole("combobox")).toHaveTextContent("This month");
});

it("reads the layer payload the backend actually sends", async () => {
  await openEvidenceSheet();

  expect(await screen.findByText("₹1,250.00")).toBeInTheDocument();
  expect(screen.getByText("₹31.25")).toBeInTheDocument();
});
