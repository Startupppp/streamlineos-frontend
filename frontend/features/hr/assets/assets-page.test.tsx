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
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
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
    filteredItems: { name: string }[];
  }) =>
    filteredItems.map((a) => (
      <div key={a.name} data-testid="asset-row">
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
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(queryKeys.hr.assets({ page: 1, limit: 20 }), seededAssets);
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
    );
  });
});
