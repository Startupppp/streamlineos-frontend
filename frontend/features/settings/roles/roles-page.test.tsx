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

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/settings/roles",
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
  PlusIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({
    iconRef: { current: null },
    hoverHandlers: {},
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: false }, refetch: jest.fn() })),
  useCan: jest.fn(() => true),
  useModuleEnabled: jest.fn(() => true),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("@/hooks/common/use-debounce", () => ({
  useDebouncedValue: <T,>(value: T) => value,
}));

jest.mock("./groups/groups-panel", () => ({
  GroupsPanel: () => null,
}));

jest.mock("./roles-list-panel", () => ({
  RolesListPanel: ({
    roles,
  }: {
    roles: { id: number; name: string }[];
  }) =>
    roles.map((r) => (
      <div key={r.id} data-testid="role-row">
        {r.name}
      </div>
    )),
}));

jest.mock("@/components/rbac/permission-matrix", () => ({
  PermissionMatrix: () => null,
}));

jest.mock("@/components/rbac/rename-role-dialog", () => ({
  RenameRoleDialog: () => null,
}));

jest.mock("@/components/rbac/role-assignments-sheet", () => ({
  RoleAssignmentsSheet: () => null,
}));

import { RolesPage } from "./roles-page";

const seededRolesPage = {
  data: [
    {
      id: 1,
      name: "Administrator",
      slug: "ADMINISTRATOR",
      description: null,
      isSystem: true,
      isCustom: false,
      version: 1,
      permissionCount: 42,
      memberCount: 3,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
};

function makeHydratedState() {
  const seed = new QueryClient();
  seed.setQueryData(
    queryKeys.roles.list({ limit: 20 }),
    seededRolesPage,
  );
  return dehydrate(seed);
}

function Wrapper({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  return (
    <TooltipProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </TooltipProvider>
  );
}

describe("RolesPage server-prefetch seam", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiClient.get as jest.Mock).mockReturnValue(new Promise(() => {}));
  });

  it("renders rows from the hydrated cache and makes no roles API call", () => {
    const state = makeHydratedState();
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <HydrationBoundary state={state}>
          <RolesPage />
        </HydrationBoundary>
      </Wrapper>,
    );

    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(apiClient.get).not.toHaveBeenCalledWith(
      "/roles",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("fetches from the API when HydrationBoundary carries no cache", () => {
    const client = new QueryClient();

    render(
      <Wrapper client={client}>
        <RolesPage />
      </Wrapper>,
    );

    expect(apiClient.get).toHaveBeenCalledWith(
      "/roles",
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
