import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WikiHomePage from "./wiki-home-page";
import { kbSpacesQueryStub } from "@/test-utils/kb-spaces-fixture";
import { ApiError } from "@/lib/api-envelope";

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
  useKbPageBacklinks: jest.fn(() => ({ data: [] })),
  useArchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnarchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/kb/page-grants", () => ({
  useKbPageGrants: jest.fn(() => ({ data: undefined, isLoading: false, hasNextPage: false, fetchNextPage: jest.fn(), isFetchingNextPage: false })),
  useCreateKbPageGrant: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useRevokeKbPageGrant: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useKbPageGrantCandidates: jest.fn(() => ({ data: undefined, isLoading: false })),
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: jest.fn(() => ({ data: undefined })),
}));

jest.mock("./page-tree", () => ({
  __esModule: true,
  default: jest.fn(({ projectId, baseHref }: { projectId?: number; baseHref?: string }) => (
    <div data-testid="page-tree" data-project-id={String(projectId ?? "")} data-base-href={baseHref ?? ""} />
  )),
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

let mockCan: (key: string) => boolean = () => true;
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockCan(key),
}));

jest.mock("./wiki-home-sections", () => ({
  WikiHomeHeaderActions: ({
    canCreate,
    isProjectScoped,
  }: {
    canCreate: boolean;
    isProjectScoped: boolean;
    projectId?: number;
  }) => (
    <div>
      {!isProjectScoped && <a href="/knowledge/chat">Ask documents</a>}
      {canCreate && <button type="button">New document</button>}
    </div>
  ),
  WikiHomeActivitySection: () => null,
  WikiHomeSharedUpdatesSection: () => null,
}));

type BuildListKeyboardOptions = Record<string, unknown>;

const mockUseBuildListKeyboard = jest.fn(
  (options: BuildListKeyboardOptions) => ({
    focusedIndex: null,
    setFocusedIndex: jest.fn(),
    receivedOptions: options,
  }),
);
jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: (options: BuildListKeyboardOptions) =>
    mockUseBuildListKeyboard(options),
}));

function lastKeyboardOptions(): BuildListKeyboardOptions {
  const calls = mockUseBuildListKeyboard.mock.calls;
  const latest = calls[calls.length - 1];
  if (latest === undefined) throw new Error("useBuildListKeyboard was never called");
  return latest[0];
}

jest.mock("@/components/shared/shortcut-help-dialog", () => ({
  ShortcutHelpDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="shortcut-help-dialog" /> : null,
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
  useKbPagesRecent,
  useKbPagesFavorites,
  useCreateKbPage,
  useKbSpaces,
} = jest.requireMock("@/hooks/api/kb") as {
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
    boundedCount: { count: items.length, isExact: true },
    facets: null,
  };
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  mockCan = () => true;
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
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
    error: undefined,
  });
  useCreateKbPage.mockReturnValue({ mutate: jest.fn(), isPending: false });
  useKbSpaces.mockReturnValue(kbSpacesQueryStub());

  useKbPageCollection.mockReturnValue({
    data: makeResponse([makeItem(1)]),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "ready" });
});

describe("WikiHomePage — favorites pagination", () => {
  it("shows a first-read favorites error with request reference and retry", async () => {
    const user = userEvent.setup();
    const refetch = jest.fn();
    useKbPagesFavorites.mockReturnValue({
      data: undefined,
      isError: true,
      error: new ApiError("Unavailable", 503, "BACKEND_UNREACHABLE", { correlationId: "favorites-req-1" }),
      hasNextPage: false,
      isFetchNextPageError: false,
      refetch,
    });

    render(<WikiHomePage />);

    expect(screen.getByRole("heading", { name: "Starred" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load favorites");
    expect(screen.getByText("favorites-req-1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps loaded favorites and retries only the failed next page", async () => {
    const user = userEvent.setup();
    const fetchNextPage = jest.fn();
    const refetch = jest.fn();
    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(7)],
      isError: true,
      error: new ApiError("Unavailable", 503),
      hasNextPage: true,
      isFetchNextPageError: true,
      fetchNextPage,
      refetch,
    });

    render(<WikiHomePage />);

    expect(screen.getByText("Page 7")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more favorites" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    expect(refetch).not.toHaveBeenCalled();
  });

  it("loads the next page of favorites without replacing visible cards", async () => {
    const user = userEvent.setup();
    const fetchNextPage = jest.fn();
    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(7)],
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage,
    });

    const { rerender } = render(<WikiHomePage />);

    expect(screen.getByText("Page 7")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more favorites" }));
    expect(fetchNextPage).toHaveBeenCalledTimes(1);

    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(7), makeItem(8)],
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage,
    });
    rerender(<WikiHomePage />);

    expect(screen.getByText("Page 7")).toBeInTheDocument();
    expect(screen.getByText("Page 8")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more favorites" })).not.toBeInTheDocument();
  });

  it("disables the favorites action while the next page is loading", () => {
    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(7)],
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage: jest.fn(),
    });

    render(<WikiHomePage />);

    expect(screen.getByRole("button", { name: "Loading favorites…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Loading favorites…" })).toHaveAttribute("aria-busy", "true");
  });

  it("does not show organization favorites in a project-scoped wiki", () => {
    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(7)],
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
    });

    render(<WikiHomePage projectId={7} />);

    expect(screen.queryByText("Starred")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more favorites" })).not.toBeInTheDocument();
  });
});

describe("WikiHomePage — contextual Ask entry", () => {
  it("offers Ask documents from Docs home now that Ask is not a sidebar destination", () => {
    render(<WikiHomePage />);
    expect(screen.getByRole("link", { name: "Ask documents" })).toHaveAttribute("href", "/knowledge/chat");
  });

  it("does not offer organization-wide Ask inside a project-scoped wiki", () => {
    render(<WikiHomePage projectId={7} />);
    expect(screen.queryByRole("link", { name: "Ask documents" })).toBeNull();
  });
});

describe("WikiHomePage — page tree mounting", () => {
  it("does not mount the page tree for the non-project-scoped wiki", () => {
    render(<WikiHomePage />);
    expect(screen.queryByTestId("page-tree")).not.toBeInTheDocument();
  });

  it("mounts the page tree for the project-scoped wiki so the user can navigate pages", () => {
    render(<WikiHomePage projectId={7} />);
    expect(screen.getByTestId("page-tree")).toBeInTheDocument();
  });

  it("passes the project-scoped baseHref to the page tree so links stay within the project", () => {
    render(<WikiHomePage projectId={7} />);
    expect(screen.getByTestId("page-tree")).toHaveAttribute("data-base-href", "/build/7/wiki");
  });

  it("calls the cursor-based collection hook to drive All pages", () => {
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

    expect(screen.getByText("Your Docs workspace starts here")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create a document/i }),
    ).toBeInTheDocument();
  });

  it("does not show the first-run empty state when pages exist", () => {
    render(<WikiHomePage />);

    expect(screen.queryByText("Your Docs workspace starts here")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Your Docs workspace starts here")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Your Docs workspace starts here")).not.toBeInTheDocument();

    mockSearchParams = new URLSearchParams();
    rerender(<WikiHomePage />);
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Your Docs workspace starts here")).toBeInTheDocument();
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

describe("WikiHomePage — keyboard shortcuts wired via useBuildListKeyboard", () => {
  beforeEach(() => {
    mockUseBuildListKeyboard.mockClear();
  });

  it("wires useBuildListKeyboard on every render so keyboard navigation is registered", () => {
    render(<WikiHomePage />);
    expect(mockUseBuildListKeyboard).toHaveBeenCalled();
  });

  it("passes onCreate when canCreate is true so the c shortcut creates a page", () => {
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(typeof options.onCreate).toBe("function");
  });

  it("passes onShortcutHelp so the ? key opens the shortcut dialog", () => {
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(typeof options.onShortcutHelp).toBe("function");
  });

  it("ShortcutHelpDialog is hidden before the ? callback fires — paired positive control below", () => {
    render(<WikiHomePage />);
    expect(screen.queryByTestId("shortcut-help-dialog")).not.toBeInTheDocument();
  });

  it("ShortcutHelpDialog opens when the onShortcutHelp callback passed to the hook is invoked", async () => {
    const { act } = await import("react");
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    const onShortcutHelp = options.onShortcutHelp as () => void;
    await act(async () => { onShortcutHelp(); });
    expect(screen.getByTestId("shortcut-help-dialog")).toBeInTheDocument();
  });

  it("passes searchInputRef to the hook for the non-project-scoped wiki so / focuses the search input", () => {
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(options.searchInputRef).toBeDefined();
  });

  it("passes searchInputRef for the project-scoped wiki because the search input is now rendered there too", () => {
    render(<WikiHomePage projectId={7} />);
    const options = lastKeyboardOptions();
    expect(options.searchInputRef).toBeDefined();
  });
});

function lastCollectionParams(): Record<string, unknown> {
  const calls = useKbPageCollection.mock.calls;
  return calls[calls.length - 1][0] as Record<string, unknown>;
}

describe("WikiHomePage — every URL filter param the spec declares reaches the collection request", () => {
  it("maps the space URL param onto the spaceId field the /kb/pages query schema declares", () => {
    mockSearchParams = new URLSearchParams("space=4");
    render(<WikiHomePage />);
    expect(lastCollectionParams().spaceId).toBe(4);
  });

  it("sends no spaceId when the space param is absent — paired control for the space test above", () => {
    render(<WikiHomePage />);
    expect(lastCollectionParams().spaceId).toBeUndefined();
  });

  it("drops a non-numeric space URL param instead of sending NaN, which the strict /kb/pages schema would answer with a 400 for the whole list", () => {
    mockSearchParams = new URLSearchParams("space=all");
    render(<WikiHomePage />);
    expect(lastCollectionParams().spaceId).toBeUndefined();
  });

  it("drops a zero space URL param because the backend schema requires a positive integer", () => {
    mockSearchParams = new URLSearchParams("space=0");
    render(<WikiHomePage />);
    expect(lastCollectionParams().spaceId).toBeUndefined();
  });

  it("passes the sort URL param through to the collection request", () => {
    mockSearchParams = new URLSearchParams("sort=title_asc");
    render(<WikiHomePage />);
    expect(lastCollectionParams().sort).toBe("title_asc");
  });

  it("falls back to updated_desc when the sort URL param is not one the backend enum accepts", () => {
    mockSearchParams = new URLSearchParams("sort=owner_asc");
    render(<WikiHomePage />);
    expect(lastCollectionParams().sort).toBe("updated_desc");
  });

  it("passes the status URL param through to the collection request", () => {
    mockSearchParams = new URLSearchParams("status=in_review");
    render(<WikiHomePage />);
    expect(lastCollectionParams().status).toBe("in_review");
  });

  it("maps owner=me onto the owner literal the backend schema declares", () => {
    mockSearchParams = new URLSearchParams("owner=me");
    render(<WikiHomePage />);
    expect(lastCollectionParams().owner).toBe("me");
  });

  it("sends no owner filter for an owner value other than me, because the backend schema accepts only the me literal", () => {
    mockSearchParams = new URLSearchParams("owner=someone-else");
    render(<WikiHomePage />);
    expect(lastCollectionParams().owner).toBeUndefined();
  });

  it("pins projectId on the project-scoped route so the wiki list cannot read another project's pages", () => {
    render(<WikiHomePage projectId={7} />);
    expect(lastCollectionParams().projectId).toBe(7);
  });

  it("sends no projectId on the organization-wide wiki — paired control for the project-scoped test above", () => {
    render(<WikiHomePage />);
    expect(lastCollectionParams().projectId).toBeUndefined();
  });

  it("bounds the request at the declared page limit so the list is never unbounded", () => {
    render(<WikiHomePage />);
    expect(lastCollectionParams().limit).toBe(50);
  });
});

describe("WikiHomePage — the create control fails closed on kb:pages:create", () => {
  beforeEach(() => {
    mockUseBuildListKeyboard.mockClear();
  });

  it("renders no New document action when kb:pages:create is denied", () => {
    mockCan = (key) => key !== "kb:pages:create";
    render(<WikiHomePage />);
    expect(screen.queryByRole("button", { name: /new document/i })).toBeNull();
  });

  it("renders the New document action when kb:pages:create is granted — paired positive control for the denial above", () => {
    render(<WikiHomePage />);
    expect(screen.getByRole("button", { name: /new document/i })).toBeInTheDocument();
  });

  it("passes no onCreate to the keyboard hook when kb:pages:create is denied so the c shortcut cannot create a page", () => {
    mockCan = (key) => key !== "kb:pages:create";
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(options.onCreate).toBeUndefined();
  });
});

describe("WikiHomePage — Manage dropdown gating", () => {
  it("passes canCreate=true to the header actions when kb:pages:create is granted", () => {
    render(<WikiHomePage />);
    expect(screen.getByRole("button", { name: /new document/i })).toBeInTheDocument();
  });

  it("passes canCreate=false to the header actions when kb:pages:create is denied so the New action is hidden", () => {
    mockCan = (key) => key !== "kb:pages:create";
    render(<WikiHomePage />);
    expect(screen.queryByRole("button", { name: /new document/i })).toBeNull();
  });

  it("renders the Starred section heading when starred pages exist", () => {
    useKbPagesFavorites.mockReturnValue({
      data: [makeItem(3)],
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      isFetchNextPageError: false,
    });
    render(<WikiHomePage />);
    expect(screen.getByRole("heading", { name: "Starred" })).toBeInTheDocument();
  });
});
