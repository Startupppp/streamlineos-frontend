import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Asset } from "@/types/hr";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/assets",
}));

jest.mock("@animateicons/react/lucide", () => ({
  PlusIcon: () => null,
  EllipsisIcon: () => null,
  Trash2Icon: () => null,
  UserPlusIcon: () => null,
  UserMinusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: { "hr:assets:view": "all" }, modules: {}, isOrgOwner: false }, isLoading: false, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
}));

jest.mock("@/features/hr/assets/asset-columns", () => ({
  buildAssetColumns: () => [
    {
      key: "name",
      header: "Asset",
      cell: (a: { name: string }) => a.name,
    },
  ],
}));

jest.mock("@/features/hr/assets/asset-form-sheet", () => ({
  AddAssetSheet: () => null,
  EditAssetSheet: () => null,
  useAssetForm: () => ({
    reset: jest.fn(),
    getValues: jest.fn(() => ({})),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
  }),
  useEditAssetForm: () => ({
    reset: jest.fn(),
    getValues: jest.fn(() => ({})),
    handleSubmit: jest.fn(),
    formState: { errors: {} },
  }),
}));

jest.mock("@/features/hr/assets/assign-asset-sheet", () => ({
  AssignAssetSheet: () => null,
}));

jest.mock("@/features/hr/assets/access-requests-tab", () => ({
  AccessRequestsTab: () => null,
}));

jest.mock("@/features/hr/assets/asset-filter-toolbar", () => ({
  AssetFilterToolbar: () => null,
}));

jest.mock("@/features/hr/assets/asset-table-section", () => ({
  AssetTableSection: ({
    filteredItems,
  }: {
    filteredItems: { name: string; assignedTo: string | null }[];
  }) =>
    filteredItems.map((a) => (
      <div
        key={a.name}
        data-testid="asset-row"
        // V-082. The rows read `assignedTo`; the Assigned summary reads the
        // backend aggregate. The test below holds the two together.
        data-assigned={a.assignedTo ? "yes" : "no"}
      >
        {a.name}
      </div>
    )),
}));

jest.mock("@/features/hr/assets/export-assets", () => ({
  exportAssetsToXlsx: jest.fn(),
}));

import { AssetsPage } from "./assets-page";

const asset: Asset = {
  id: 1,
  orgId: "org-1",
  name: "MacBook Pro",
  type: "LAPTOP",
  brand: "Apple",
  model: null,
  serialNumber: null,
  assignedTo: null,
  status: "AVAILABLE",
  purchaseDate: null,
  purchaseCost: null,
  location: null,
  notes: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const seededAssets = {
  data: [asset],
  counts: { total: 1, available: 1, assigned: 0, maintenance: 0, retired: 0 },
  pagination: { limit: 20, hasMore: false, nextCursor: null },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(queryKeys.hr.assets({ limit: 20 }), seededAssets);
  return dehydrate(seed);
}

function Wrapper({ client, children }: { client: QueryClient; children: ReactNode }) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("AssetsPage server-prefetch seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders rows from the hydrated cache and makes no assets API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <AssetsPage />
        </HydrationBoundary>
      </Wrapper>,
    );

    expect(screen.getByText("MacBook Pro")).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/hr/assets",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("fetches from the API when HydrationBoundary carries no cache", () => {
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <AssetsPage />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "/hr/assets",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});

/**
 * V-082. The Assigned summary card was rendered from a status-derived backend
 * count while the rows and the assignment filter both read `assignedTo` — so an
 * asset whose status said ASSIGNED but whose `assigned_to` was empty made the
 * card and the list disagree, with nothing on screen to explain it. The backend
 * half makes the aggregate count `assigned_to`; this is the frontend half's
 * guard, that the card binds to that aggregate and to nothing else.
 */
describe("AssetsPage assignment summary", () => {
  function assetRow(id: number, overrides: Partial<Asset>): Asset {
    return { ...asset, id, name: `Asset ${id}`, ...overrides };
  }

  const MIXED = {
    data: [
      assetRow(1, { assignedTo: "usr-1", status: "ASSIGNED" }),
      assetRow(2, { assignedTo: "usr-2", status: "ASSIGNED" }),
      assetRow(3, { assignedTo: null, status: "AVAILABLE" }),
      assetRow(4, { assignedTo: null, status: "MAINTENANCE" }),
    ],
    counts: { total: 4, available: 1, assigned: 2, maintenance: 1, retired: 0 },
    pagination: { limit: 20, hasMore: false, nextCursor: null },
  };

  it("the Assigned summary equals the number of rows showing an assignee, for a mix of assigned and unassigned assets", () => {
    const seed = new QueryClient();
    seed.setQueryData(queryKeys.hr.assets({ limit: 20 }), MIXED);
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={dehydrate(seed)}>
          <AssetsPage />
        </HydrationBoundary>
      </Wrapper>,
    );

    const rowsWithAssignee = screen
      .getAllByTestId("asset-row")
      .filter((row) => row.getAttribute("data-assigned") === "yes");
    expect(rowsWithAssignee).toHaveLength(2);

    const assignedCard = screen.getByText("Assigned").closest("div")
      ?.parentElement as HTMLElement;
    expect(assignedCard).toHaveTextContent(String(rowsWithAssignee.length));
    // Paired with the totals, so a card bound to the wrong aggregate cannot pass.
    expect(screen.getByText("Total Assets").closest("div")?.parentElement)
      .toHaveTextContent("4");
  });
});
