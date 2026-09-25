import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WikiHomePage from "./wiki-home-page";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/knowledge/wiki",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageTreeInfinite: jest.fn(),
  useKbProjectPagesTree: jest.fn(),
  useKbPagesRecent: jest.fn(),
  useKbPagesFavorites: jest.fn(),
  useCreateKbPage: jest.fn(),
  useKbSpaces: jest.fn(),
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/kb/hr-link-config", () => ({
  useHrKbLinkFlags: () => ({ link: false, search: false, ai: false }),
}));

jest.mock("@/hooks/api/kb/linked-documents", () => ({
  useLinkedDocuments: () => ({ data: undefined }),
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
  DataTable: jest.fn(
    (props: {
      data: unknown[];
      emptyState?: React.ReactNode;
      pagination?: {
        hasMore: boolean;
        hasPrevious: boolean;
        onNext: () => void;
        onPrevious: () => void;
      };
    }) => {
      if (!props.data || props.data.length === 0)
        return props.emptyState ?? null;
      return (
        <div>
          <div data-testid="table-rows">{props.data.length} rows</div>
          {props.pagination && (
            <div>
              <button
                type="button"
                aria-label="Next page"
                onClick={props.pagination.onNext}
                disabled={!props.pagination.hasMore}
              >
                Next
              </button>
              <button
                type="button"
                aria-label="Previous page"
                onClick={props.pagination.onPrevious}
                disabled={!props.pagination.hasPrevious}
              >
                Previous
              </button>
            </div>
          )}
        </div>
      );
    },
  ),
}));

const {
  useKbPageTreeInfinite,
  useKbPagesRecent,
  useKbPagesFavorites,
  useCreateKbPage,
  useKbSpaces,
} = jest.requireMock("@/hooks/api/kb") as {
  useKbPageTreeInfinite: jest.Mock;
  useKbPagesRecent: jest.Mock;
  useKbPagesFavorites: jest.Mock;
  useCreateKbPage: jest.Mock;
  useKbSpaces: jest.Mock;
};

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

function makeItem(id: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Page ${id}`,
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "published",
    visibility: "org",
    contentType: "rich-text",
    trustState: "verified",
    ownerMembershipId: 1,
    ownerUserId: "user-1",
    createdById: "user-1",
    createdByMembershipId: 1,
    lastEditedById: "user-1",
    lastEditedByMembershipId: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 1,
    aclRevision: 1,
    sharedBy: null,
    ...extra,
  };
}

function makeResponse(
  items: ReturnType<typeof makeItem>[],
  paginationOverrides: Record<string, unknown> = {},
) {
  return {
    data: items,
    pagination: {
      limit: 50,
      hasMore: false,
      nextCursor: null,
      ...paginationOverrides,
    },
    facets: null,
  };
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockSearchParams = new URLSearchParams();

  useKbPagesRecent.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  });
  useKbPagesFavorites.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  });
  useCreateKbPage.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useKbSpaces.mockReturnValue({ data: [], isLoading: false, isError: false });

  useKbPageCollection.mockReturnValue({
    data: makeResponse([makeItem(1)]),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("WikiHomePage — tree hook never called", () => {
  it("does not call the infinite tree hook on mount", () => {
    render(<WikiHomePage />);
    expect(useKbPageTreeInfinite).not.toHaveBeenCalled();
  });

  it("calls the cursor-based collection hook to drive All pages instead", () => {
    render(<WikiHomePage />);
    expect(useKbPageCollection).toHaveBeenCalled();
  });
});

describe("WikiHomePage — first-run and filtered-empty states", () => {
  it("shows first-run empty state when the tenant has no pages and no filters are active", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomePage />);

    expect(screen.getByText("Your wiki starts here")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create a page/i }),
    ).toBeInTheDocument();
  });

  it("does not show the first-run empty state when pages exist", () => {
    render(<WikiHomePage />);

    expect(screen.queryByText("Your wiki starts here")).not.toBeInTheDocument();
    expect(screen.getByTestId("table-rows")).toBeInTheDocument();
  });

  it("first-run state offers Browse templates link as a second action", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomePage />);

    expect(screen.getByRole("link", { name: /browse templates/i })).toBeInTheDocument();
  });

  it("shows filtered-empty with clear-filters when a filter is active and result is empty", () => {
    mockSearchParams = new URLSearchParams("status=draft");
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomePage />);

    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your wiki starts here")).not.toBeInTheDocument();
  });

  it("filtered-empty renders differently from first-run — filtered offers clear action that first-run does not", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    mockSearchParams = new URLSearchParams("status=archived");
    const { rerender } = render(<WikiHomePage />);
    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your wiki starts here")).not.toBeInTheDocument();

    mockSearchParams = new URLSearchParams();
    rerender(<WikiHomePage />);
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Your wiki starts here")).toBeInTheDocument();
  });
});

describe("WikiHomePage — cursor pagination retains URL filter state", () => {
  it("advances cursor to next page without losing the status filter", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("status=published");

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], {
        hasMore: true,
        nextCursor: "cursor-abc",
      }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiHomePage />);

    await user.click(screen.getByRole("button", { name: /next page/i }));

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({
        status: "published",
        cursor: "cursor-abc",
      }),
    );
  });

  it("retreats cursor to first page without losing the owner filter", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("owner=me");

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], {
        hasMore: true,
        nextCursor: "cursor-xyz",
      }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiHomePage />);

    await user.click(screen.getByRole("button", { name: /next page/i }));

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(2)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    await user.click(screen.getByRole("button", { name: /previous page/i }));

    const lastCall = useKbPageCollection.mock.calls[
      useKbPageCollection.mock.calls.length - 1
    ][0] as Record<string, unknown>;
    expect(lastCall.owner).toBe("me");
    expect(lastCall.cursor).toBeUndefined();
  });
});

describe("WikiHomePage — view toggle and status filter round-trip URL", () => {
  it("card view button updates URL to view=card", async () => {
    const user = userEvent.setup();
    render(<WikiHomePage />);

    await user.click(screen.getByRole("button", { name: /card view/i }));

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("view=card"),
      expect.anything(),
    );
  });

  it("list view button removes view param from URL when currently in card view", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("view=card");
    render(<WikiHomePage />);

    await user.click(screen.getByRole("button", { name: /list view/i }));

    expect(mockReplace).toHaveBeenCalled();
    const lastUrl = mockReplace.mock.calls[
      mockReplace.mock.calls.length - 1
    ][0] as string;
    expect(lastUrl).not.toContain("view=card");
  });

  it("card view button reflects active state via aria-pressed when view=card is in URL", () => {
    mockSearchParams = new URLSearchParams("view=card");
    render(<WikiHomePage />);

    expect(
      screen.getByRole("button", { name: /card view/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /list view/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("list view is active by default when no view param in URL", () => {
    render(<WikiHomePage />);

    expect(
      screen.getByRole("button", { name: /list view/i }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /card view/i }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
