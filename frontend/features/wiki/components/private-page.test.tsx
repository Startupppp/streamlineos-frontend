import { render, screen } from "@testing-library/react";
import PrivatePage from "./private-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/private",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbSpaces: jest.fn(() => ({ data: [], isLoading: false, isError: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <>{loading}</>;
    if (resolution.kind === "empty") return <>{empty ?? children}</>;
    return <>{children}</>;
  },
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data, emptyState }: { data: unknown[]; emptyState?: React.ReactNode }) => (
    <div>{data.length === 0 ? emptyState : <div data-testid="table-rows" />}</div>
  ),
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

function makeItem(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    title: "My doc",
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "draft",
    visibility: "private",
    contentType: "rich-text",
    trustState: "unverified",
    ownerMembershipId: 10,
    ownerUserId: "user-me",
    createdById: "user-me",
    createdByMembershipId: 10,
    lastEditedById: "user-me",
    lastEditedByMembershipId: 10,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 1,
    aclRevision: 1,
    sharedBy: null,
    ...overrides,
  };
}

describe("PrivatePage — My pages", () => {
  it("uses owner=me filter so a page owned by another admin does not appear", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(useKbPageCollection).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "me" }),
    );
  });

  it("never uses sharedWithMe=1 filter — that belongs to Shared with me", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(useKbPageCollection).toHaveBeenCalledWith(
      expect.not.objectContaining({ sharedWithMe: "1" }),
    );
  });

  it("shows owned page when the server returns it", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<PrivatePage />);

    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-rows")).toBeInTheDocument();
  });

  it("shows first-empty state when the server returns no owned pages", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(screen.getByText("No pages yet")).toBeInTheDocument();
  });

  it("uses My pages as the page title — not Private pages", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<PrivatePage />);

    expect(screen.getByText("My pages")).toBeInTheDocument();
    expect(screen.queryByText("Private pages")).not.toBeInTheDocument();
  });
});
