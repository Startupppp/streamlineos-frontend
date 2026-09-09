import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LotDetailClient } from "./lot-detail-client";
import { downloadGenealogyCsv } from "@/hooks/api/inventory/genealogy";

/**
 * `GET /inventory/traceability/genealogy/export` had no caller. A recall chain
 * could be read on screen and never handed to a regulator, an insurer or anybody
 * without a login — which for an audit trail is most of the way to not having
 * one.
 *
 * Reachability is the claim being tested. The button lives in the genealogy
 * panel, the panel lives on the lot detail screen, and that chain is what a
 * component test of the button alone would not have exercised.
 */

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/inventory/lots/44",
  useSearchParams: () => new URLSearchParams(),
}));

const mockCan = jest.fn((_key: string): boolean => true);
jest.mock("@/hooks/api/access", () => ({ useCan: (key: string) => mockCan(key) as boolean }));

jest.mock("@/hooks/api/inventory/genealogy", () => ({
  ...jest.requireActual("@/hooks/api/inventory/genealogy"),
  useLotGenealogy: () => ({
    data: {
      anchor: {
        kind: "lot",
        id: 44,
        key: "lot:44",
        label: "LOT-44",
        productVariantId: 7,
        productName: "Paracetamol 500mg",
        sku: "SKU-7",
      },
      caps: { direction: "both", maxDepth: 4, maxNodes: 100, maxFanout: 25 },
      nodes: [],
      edges: [],
      truncation: {
        complete: true,
        reasons: [],
        depthReached: 1,
        nodeCount: 1,
        edgeCount: 0,
        unexploredNodes: 0,
        fanoutTruncatedNodes: [],
      },
      corrections: { excludedFromWalk: false },
      warehouseScoped: false,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  downloadGenealogyCsv: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/hooks/api/inventory/traceability", () => ({
  useLot: () => ({
    data: {
      id: 44,
      lotNumber: "LOT-44",
      variantId: 7,
      variantSku: "SKU-7",
      productName: "Paracetamol 500mg",
      status: "ACTIVE",
      expiryDate: "2027-01-31",
      currentStock: 120,
      stockByLocation: [],
      movements: [],
      createdAt: "2026-08-01T00:00:00.000Z",
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useUpdateLotStatus: () => ({ mutate: jest.fn(), isPending: false }),
  useTraceability: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

const mockDownload = downloadGenealogyCsv as jest.MockedFunction<typeof downloadGenealogyCsv>;

function renderLot(): void {
  renderWithProviders(
    <TooltipProvider>
      <LotDetailClient lotId={44} />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  mockCan.mockImplementation(() => true);
  mockDownload.mockClear();
});

it("puts the export on the genealogy panel the lot screen renders", () => {
  renderLot();

  expect(screen.getByRole("button", { name: /export csv/i })).toBeInTheDocument();
});

it("exports the walk the reader is looking at, not a differently bounded one", async () => {
  renderLot();
  await userEvent.click(screen.getByRole("button", { name: /export csv/i }));

  await waitFor(() => expect(mockDownload).toHaveBeenCalledTimes(1));
  expect(mockDownload).toHaveBeenCalledWith({
    lotId: 44,
    direction: "both",
    maxDepth: 4,
    includeReversed: false,
  });
});

/**
 * Reading a chain and carrying it out of the building are different rights, and
 * the route says so: the graph is `inventory:stock:read`, the export is
 * `inventory:export`.
 */
it("hides the export from somebody who may read the chain but not take it", () => {
  mockCan.mockImplementation((key: string) => key !== "inventory:export");
  renderLot();

  expect(screen.queryByRole("button", { name: /export csv/i })).not.toBeInTheDocument();
});
