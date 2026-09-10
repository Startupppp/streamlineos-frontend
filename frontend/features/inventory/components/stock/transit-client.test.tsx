import { screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { renderWithProviders } from "@/test-utils";
import { TransitClient } from "./transit-client";
import type { StrandedTransitResult, StrandedTransitRow } from "@/hooks/api/inventory/transit";

/**
 * The four answers this screen has to keep apart.
 *
 * A refused read is not "nothing is stranded". Both would otherwise render as a
 * calm empty table, and only one of them means the warehouse is clear — the
 * other means the reader has not been given `inventory:stock:read` and is being
 * told, wrongly, that there is no problem. The same distinction has to hold
 * between a failed request and an empty one, and between the two empties: no
 * stranded lines in the STRANDED view is a different sentence from no transfers
 * on the road at all.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/stock/transit",
  useSearchParams: () => new URLSearchParams(),
}));

const mockUseCan = jest.fn();
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key) as boolean,
}));

const mockUseStrandedTransit = jest.fn();
jest.mock("@/hooks/api/inventory/transit", () => ({
  ...jest.requireActual("@/hooks/api/inventory/transit"),
  useStrandedTransit: (...args: unknown[]) => mockUseStrandedTransit(...args) as unknown,
  useExitTransit: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/inventory/warehouses", () => ({
  useWarehouses: () => ({ data: [{ id: 7, name: "North DC", code: "GDC" }] }),
}));

function row(overrides: Partial<StrandedTransitRow> = {}): StrandedTransitRow {
  return {
    transferId: 41,
    transferLineId: 88,
    referenceNumber: "TRF-0041",
    status: "COMPLETED",
    dispatchedAt: "2026-09-01T08:00:00.000Z",
    productVariantId: 12,
    sku: "CEM-53-50KG",
    variantName: "OPC 53 Grade Cement 50kg",
    lotNumber: "LOT-A19",
    serialId: null,
    quantityDispatched: "100.0000",
    quantityReceived: "75.0000",
    quantityStranded: "25.0000",
    transitLocationCode: "GDC-TRANSIT",
    transitWarehouseId: 7,
    transitOnHand: "25.0000",
    ...overrides,
  };
}

function result(items: StrandedTransitRow[]): StrandedTransitResult {
  return { items, total: items.length, page: 1, totalPages: 1 };
}

function renderWith(
  query: Partial<{
    data: StrandedTransitResult | undefined;
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
  }>,
  permissions: Record<string, boolean> = {
    "inventory:stock:read": true,
    "inventory:transit:abandon": true,
  },
) {
  mockUseCan.mockImplementation((key: string) => permissions[key] ?? false);
  mockUseStrandedTransit.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...query,
  });
  // `PageWrapper` renders a `Tooltip`, which the real tree gets from
  // `query-provider`. Without it the page throws before a single assertion runs.
  return renderWithProviders(
    <TooltipProvider>
      <TransitClient />
    </TooltipProvider>,
  );
}

afterEach(() => jest.clearAllMocks());

describe("in-transit queue", () => {
  it("says the read was refused rather than showing an empty queue", () => {
    renderWith({ data: result([]) }, { "inventory:stock:read": false });

    expect(screen.getByText(/inventory:stock:read/)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is stranded/i)).not.toBeInTheDocument();
  });

  it("says the request failed rather than showing an empty queue", () => {
    renderWith({ isError: true, error: new Error("Gateway timeout") });

    expect(screen.getByText(/Couldn't load what is in transit/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is stranded/i)).not.toBeInTheDocument();
  });

  it("distinguishes an empty stranded view from an empty road", () => {
    renderWith({ data: result([]) });

    expect(screen.getByText(/Nothing is stranded/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nothing is on the road/i)).not.toBeInTheDocument();
  });

  it("names the product and the document, never a database id", () => {
    renderWith({ data: result([row()]) });

    expect(screen.getByText("OPC 53 Grade Cement 50kg")).toBeInTheDocument();
    expect(screen.getByText("TRF-0041")).toBeInTheDocument();
    expect(screen.getByText("North DC")).toBeInTheDocument();
    // The line id, the variant id and the warehouse id are all in the row and
    // none of them is a thing to show an operator.
    expect(screen.queryByText("88")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
  });

  it("offers no resolution to a reader who cannot abandon transit", () => {
    renderWith(
      { data: result([row()]) },
      { "inventory:stock:read": true, "inventory:transit:abandon": false },
    );

    expect(screen.getByText("OPC 53 Grade Cement 50kg")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resolve/i })).not.toBeInTheDocument();
  });

  it("offers it to a reader who can", () => {
    renderWith({ data: result([row()]) });

    expect(screen.getByRole("button", { name: /Resolve/i })).toBeInTheDocument();
  });
});
