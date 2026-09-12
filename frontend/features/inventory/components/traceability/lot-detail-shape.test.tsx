import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LotDetailClient } from "./lot-detail-client";

/**
 * `GET /inventory/lots/:lotId` answers `{ lot, stockByLocation, movements }`,
 * the lot nests its variant and product, and every quantity is a
 * `numeric(18,4)` decimal string. The screen used to read a flat lot with a
 * numeric `currentStock` the backend has never sent, so the stat tile called
 * `.toLocaleString()` on `undefined` and the page threw on open.
 *
 * The payload here is the service's own projection, two stock rows deep, so
 * the on-hand figure has to be summed out of strings rather than read off a
 * field.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/lots/44",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/access", () => ({ useCan: () => true }));

jest.mock("@/hooks/api/inventory/genealogy", () => ({
  ...jest.requireActual("@/hooks/api/inventory/genealogy"),
  useLotGenealogy: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  downloadGenealogyCsv: jest.fn(() => Promise.resolve()),
}));

const mutate = jest.fn();

jest.mock("@/hooks/api/inventory/traceability", () => ({
  useLot: () => ({
    data: {
      lot: {
        id: 44,
        lotNumber: "LOT-44",
        productVariantId: 7,
        status: "ACTIVE",
        manufactureDate: "2026-01-05",
        expiryDate: "2027-01-31",
        supplierLotNumber: "SUP-9",
        createdAt: "2026-08-01T00:00:00.000Z",
        productVariant: {
          id: 7,
          sku: "SKU-7",
          name: "500mg strip",
          product: { id: 3, name: "Paracetamol 500mg" },
        },
      },
      stockByLocation: [
        {
          locationId: 11,
          locationName: "Pune A1",
          locationCode: "A1",
          warehouseId: 2,
          warehouseName: "Pune",
          onHand: "120.5000",
          committed: "4.0000",
          blockedQty: null,
        },
        {
          locationId: 12,
          locationName: "Pune A2",
          locationCode: "A2",
          warehouseId: 2,
          warehouseName: "Pune",
          onHand: "4.5000",
          committed: "0.0000",
          blockedQty: null,
        },
      ],
      movements: [
        {
          id: 901,
          transactionType: "GRN",
          quantityChange: "120.5000",
          referenceType: "inv_grn",
          referenceId: "55",
          notes: null,
          createdAt: "2026-08-01T09:00:00.000Z",
          location: { id: 11, name: "Pune A1", code: "A1" },
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useUpdateLotStatus: () => ({ mutate, isPending: false }),
  useTraceability: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

function renderLot(): void {
  renderWithProviders(
    <TooltipProvider>
      <LotDetailClient lotId={44} />
    </TooltipProvider>,
  );
}

it("names the product through the lot's own variant, not a flat field", () => {
  renderLot();

  expect(screen.getByText("Lot LOT-44")).toBeInTheDocument();
  expect(screen.getByText("Paracetamol 500mg · SKU-7")).toBeInTheDocument();
});

it("sums on hand out of the decimal strings each location carries", () => {
  renderLot();

  expect(screen.getAllByText("On Hand").length).toBeGreaterThan(0);
  expect(screen.getByText("125")).toBeInTheDocument();
  expect(screen.getByText("120.5")).toBeInTheDocument();
  expect(screen.getByText("4.5")).toBeInTheDocument();
});

it("renders a movement by its type and signed quantity, never its actor id", () => {
  renderLot();

  expect(screen.getByText("GRN")).toBeInTheDocument();
  expect(screen.getByText("+120.5")).toBeInTheDocument();
  expect(screen.queryByText(/user_/)).not.toBeInTheDocument();
});
