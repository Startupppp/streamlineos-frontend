import { render, screen } from "@testing-library/react";
import { ManagedProductOverviewUpdatesCard } from "./managed-product-overview-updates-card";

jest.mock("@/hooks/api/build/managed-product-updates", () => ({
  useProductUpdates: jest.fn(),
}));

let mockScopes: Record<string, string> = { "build:managed-products:view": "all" };
jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: mockScopes, modules: {} },
    isLoading: false,
    isError: false,
    error: null,
  }),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const { useProductUpdates } = jest.requireMock("@/hooks/api/build/managed-product-updates") as {
  useProductUpdates: jest.Mock;
};

function update(id: number, body: string) {
  return {
    id,
    orgId: "org-1",
    managedProductId: 7,
    body,
    version: 1,
    authorMembershipId: 3,
    authorName: "Ada Lovelace",
    createdAt: "2026-10-15T10:00:00.000Z",
    updatedAt: "2026-10-15T10:00:00.000Z",
  };
}

function result(rows: ReturnType<typeof update>[]) {
  return {
    data: { data: rows, pagination: { limit: 20, hasMore: false, nextCursor: null } },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("ManagedProductOverviewUpdatesCard", () => {
  beforeEach(() => {
    mockScopes = { "build:managed-products:view": "all" };
  });

  it("shows the latest three posted updates with their author, so a posted update appears on the overview", () => {
    useProductUpdates.mockReturnValue(
      result([update(4, "Fourth"), update(3, "Third"), update(2, "Second"), update(1, "First")]),
    );
    render(<ManagedProductOverviewUpdatesCard managedProductId={7} />);

    expect(screen.getByText("Fourth")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getAllByText(/Ada Lovelace/)).toHaveLength(3);
  });

  it("says no update has been posted only when the read succeeded empty", () => {
    useProductUpdates.mockReturnValue(result([]));
    render(<ManagedProductOverviewUpdatesCard managedProductId={7} />);
    expect(screen.getByText(/No updates posted yet/)).toBeInTheDocument();
  });

  it("tells a member without the permission they are denied, not that nothing was posted", () => {
    mockScopes = {};
    // The hook is disabled for them: no data, not loading, no error.
    useProductUpdates.mockReturnValue({ ...result([]), data: undefined });
    render(<ManagedProductOverviewUpdatesCard managedProductId={7} />);
    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.queryByText(/No updates posted yet/)).not.toBeInTheDocument();
  });
});
