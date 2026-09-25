import { render, screen } from "@testing-library/react";
import SharedPage from "./shared-page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/shared",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbSpaces: jest.fn(() => ({ data: [], isLoading: false, isError: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: jest.fn(
    ({
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
  ),
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: jest.fn((props) => {
    if (!props.data || props.data.length === 0) return props.emptyState ?? null;
    return (
      <table>
        <thead>
          <tr>
            {props.columns?.map((c: { key: string; header: string }) => (
              <th key={c.key}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.data.map((row: Record<string, unknown>, i: number) => (
            <tr key={i}>
              {props.columns?.map(
                (c: { key: string; cell: (row: Record<string, unknown>) => React.ReactNode }) => (
                  <td key={c.key}>{c.cell(row)}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }),
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

function makeSharedItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    title: "Handbook",
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "published",
    visibility: "org",
    contentType: "rich-text",
    trustState: "verified",
    ownerMembershipId: 5,
    ownerUserId: "user-5",
    createdById: "user-5",
    createdByMembershipId: 5,
    lastEditedById: "user-5",
    lastEditedByMembershipId: 5,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 1,
    aclRevision: 1,
    sharedBy: {
      membershipId: 5,
      at: "2026-08-01T00:00:00Z",
      access: "edit",
    },
    ...overrides,
  };
}

describe("SharedPage — flash fix and server-side filtering", () => {
  it("does not show empty state while the request is in flight", () => {
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "loading" });

    render(<SharedPage />);

    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("renders a shared page the signed-in user authored, proving the list no longer filters by client-side authorship", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [
          makeSharedItem({
            id: 4242,
            title: "Drafted by me, shared back to me",
            createdById: "user-me",
            createdByMembershipId: 1,
          }),
        ],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<SharedPage />);

    expect(
      screen.getByText("Drafted by me, shared back to me"),
    ).toBeInTheDocument();
  });

  it("an org-visible page from another user does NOT appear — the server owns the sharedWithMe=1 filter", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<SharedPage />);

    expect(useKbPageCollection).toHaveBeenCalledWith(
      expect.objectContaining({ sharedWithMe: "1" }),
    );
    expect(screen.getByText("Nothing shared with you")).toBeInTheDocument();
  });

  it("shows shared pages when the request resolves with data", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeSharedItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<SharedPage />);

    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
    expect(screen.getByText("Handbook")).toBeInTheDocument();
  });

  it("sharedBy column renders the member identifier", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeSharedItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<SharedPage />);

    expect(screen.getByText("Member #5")).toBeInTheDocument();
  });

  it("access column renders the human-readable access label", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeSharedItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<SharedPage />);

    expect(screen.getByText("Can edit")).toBeInTheDocument();
  });

  it("uses sharedWithMe=1 and never owner=me", () => {
    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<SharedPage />);

    expect(useKbPageCollection).toHaveBeenCalledWith(
      expect.not.objectContaining({ owner: "me" }),
    );
  });

  it("shows the access-lost recovery state, not the first-empty state, once a previously visible share disappears", () => {
    useKbPageCollection.mockReturnValue({
      data: {
        data: [makeSharedItem()],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
        facets: null,
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    const { rerender } = render(<SharedPage />);
    expect(screen.getByText("Handbook")).toBeInTheDocument();

    useKbPageCollection.mockReturnValue({
      data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null }, facets: null },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    rerender(<SharedPage />);

    expect(screen.getByText("Your access may have changed")).toBeInTheDocument();
    expect(screen.queryByText("Nothing shared with you")).not.toBeInTheDocument();
  });
});
