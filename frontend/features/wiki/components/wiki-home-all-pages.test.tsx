import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WikiHomeAllPages } from "./wiki-home-all-pages";
import {
  resolveKbPageActions,
  type KbPageActionCapabilities,
  type KbPageActionSubject,
} from "@/features/wiki/lib/page-action-descriptors";
import type { DataTableColumn } from "@/components/ui/data-table.types";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/knowledge/wiki",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbSpaces: jest.fn(() =>
    jest
      .requireActual<typeof import("@/test-utils/kb-spaces-fixture")>(
        "@/test-utils/kb-spaces-fixture",
      )
      .kbSpacesQueryStub(),
  ),
  useCreateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useKbPageBacklinks: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(() => ({ data: [] })),
}));

function setNavigatorOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => {
    if (key === "kb:pages:import") return false;
    return true;
  },
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

jest.mock("@/components/ui/table-pagination", () => ({
  TablePagination: jest.fn(
    (props: {
      mode: string;
      rowCount: number;
      hasMore: boolean;
      hasPrevious: boolean;
      onNext: () => void;
      onPrevious: () => void;
    }) => (
      <div data-testid="card-pagination">
        <button
          type="button"
          aria-label="Next page"
          onClick={props.onNext}
          disabled={!props.hasMore}
        >
          Next
        </button>
        <button
          type="button"
          aria-label="Previous page"
          onClick={props.onPrevious}
          disabled={!props.hasPrevious}
        >
          Previous
        </button>
      </div>
    ),
  ),
  useCursorPager: jest.fn(() => ({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
  })),
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    "data-action-id": actionId,
  }: {
    children: React.ReactNode;
    "data-action-id"?: string;
  }) => <div data-testid={`action-${actionId ?? "unknown"}`}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { useOrgMembersByIds } = jest.requireMock(
  "@/hooks/api/organization",
) as { useOrgMembersByIds: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

const { useCursorPager } = jest.requireMock(
  "@/components/ui/table-pagination",
) as { useCursorPager: jest.Mock };

const { DataTable } = jest.requireMock("@/components/ui/data-table") as {
  DataTable: jest.Mock;
};

type ListRow = ReturnType<typeof makeItem>;

function lastRenderedListColumns(): DataTableColumn<ListRow>[] {
  const lastCall = DataTable.mock.calls.at(-1);
  if (!lastCall) throw new Error("DataTable was never rendered");
  const props: { columns: DataTableColumn<ListRow>[] } = lastCall[0];
  return props.columns;
}

function renderListCell(columnKey: string, row: ListRow) {
  const column = lastRenderedListColumns().find((c) => c.key === columnKey);
  if (!column) throw new Error(`No list column named ${columnKey}`);
  return render(<>{column.cell(row)}</>);
}

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
  countOverrides: Partial<{ count: number; isExact: boolean }> = {},
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
    boundedCount: {
      count: items.length,
      isExact: true,
      ...countOverrides,
    },
  };
}

const FULL_CAPABILITIES: KbPageActionCapabilities = {
  canCreate: true,
  canUpdate: true,
  canManage: true,
  canDelete: true,
  canExport: true,
  canManageTemplates: true,
  isEditable: true,
};

const NEUTRAL_SUBJECT: KbPageActionSubject = {
  isFavorite: false,
  isLocked: false,
  hasCover: false,
};

beforeEach(() => {
  mockReplace.mockClear();
  mockPush.mockClear();
  setNavigatorOnline(true);
  mockSearchParams = new URLSearchParams("view=card");
  useKbPageCollection.mockReturnValue({
    data: makeResponse([makeItem(1)]),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "ready" });
  useCursorPager.mockReturnValue({
    cursor: undefined,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
  });
});

describe("WikiHomeAllPages — card view descriptor parity", () => {
  it("card action menu is absent when there is no data — fails before menus are wired", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomeAllPages />);

    expect(
      screen.queryByRole("button", { name: /page actions/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a page actions button for each card in card view — proves menu is wired", () => {
    render(<WikiHomeAllPages />);

    expect(
      screen.getAllByRole("button", { name: /page actions/i }),
    ).toHaveLength(1);
  });

  it("card menu exposes the same action ids as resolveKbPageActions for a page with no cover", () => {
    render(<WikiHomeAllPages />);

    const expectedActions = resolveKbPageActions(NEUTRAL_SUBJECT, FULL_CAPABILITIES);

    expectedActions.forEach((action) => {
      expect(screen.getByTestId(`action-${action.id}`)).toBeInTheDocument();
    });
  });

  it("card menu exposes exactly the action set the descriptor module resolves — no extras", () => {
    render(<WikiHomeAllPages />);

    const expectedIds = resolveKbPageActions(
      NEUTRAL_SUBJECT,
      FULL_CAPABILITIES,
    ).map((a) => a.id);

    expectedIds.forEach((id) => {
      expect(screen.getByTestId(`action-${id}`)).toBeInTheDocument();
    });

    const renderedActionIds = screen
      .getAllByTestId(/^action-/)
      .map((el) => el.getAttribute("data-testid")?.replace("action-", "") ?? "");

    expect(renderedActionIds.sort()).toEqual([...expectedIds].sort());
  });
});

describe("WikiHomeAllPages — card view cursor pagination", () => {
  it("shows Next and Previous pagination controls in card view when hasMore is true", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-1" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);

    const pagination = screen.getByTestId("card-pagination");
    expect(
      within(pagination).getByRole("button", { name: /next page/i }),
    ).toBeInTheDocument();
    expect(
      within(pagination).getByRole("button", { name: /previous page/i }),
    ).toBeInTheDocument();
  });

  it("Next button is enabled when hasMore is true", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-1" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);

    const pagination = screen.getByTestId("card-pagination");
    expect(
      within(pagination).getByRole("button", { name: /next page/i }),
    ).not.toBeDisabled();
  });

  it("Next button is disabled when hasMore is false", () => {
    render(<WikiHomeAllPages />);

    const pagination = screen.getByTestId("card-pagination");
    expect(
      within(pagination).getByRole("button", { name: /next page/i }),
    ).toBeDisabled();
  });

  it("card view pagination advances cursor on Next click", async () => {
    const user = userEvent.setup();
    const mockGoNext = jest.fn();
    useCursorPager.mockReturnValue({
      cursor: undefined,
      hasPrevious: false,
      goNext: mockGoNext,
      goPrevious: jest.fn(),
    });

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-abc" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);

    const pagination = screen.getByTestId("card-pagination");
    await user.click(within(pagination).getByRole("button", { name: /next page/i }));

    expect(mockGoNext).toHaveBeenCalledWith("cursor-abc");
  });
});

describe("WikiHomeAllPages — bounded count display", () => {
  it("renders the exact page count when isExact is true", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1), makeItem(2)], {}, { count: 2, isExact: true }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);

    expect(screen.getByText("2 pages")).toBeInTheDocument();
  });

  it("renders the count in N+ form when isExact is false, so the user knows more pages exist beyond the count cap", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], {}, { count: 500, isExact: false }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);

    expect(screen.getByText("500+ pages")).toBeInTheDocument();
  });

  it("does not render a count while the collection is loading", () => {
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "loading" });

    render(<WikiHomeAllPages />);

    expect(screen.queryByText(/pages$/)).not.toBeInTheDocument();
  });
});

describe("WikiHomeAllPages — trust badges in the default list view", () => {
  it("BITE: the list view flags a page whose owner membership is missing", () => {
    mockSearchParams = new URLSearchParams();
    const orphan = makeItem(1, { ownerMembershipId: null });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([orphan]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);
    const cell = renderListCell("trustState", orphan);

    expect(within(cell.container).getByText("Owner missing")).toBeInTheDocument();
  });

  it("a page that has an owner carries no owner-missing flag in the list view", () => {
    mockSearchParams = new URLSearchParams();
    const owned = makeItem(2);
    useKbPageCollection.mockReturnValue({
      data: makeResponse([owned]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);
    const cell = renderListCell("trustState", owned);

    expect(within(cell.container).queryByText("Owner missing")).not.toBeInTheDocument();
    expect(within(cell.container).getByText("Verified")).toBeInTheDocument();
  });
});

describe("WikiHomeAllPages — error forwarding to usePageState (FE-41)", () => {
  it("forwards isError and error to usePageState so a 402 shows the upgrade path rather than a silent empty list", () => {
    mockSearchParams = new URLSearchParams();
    const fetchError = new Error("Forbidden");
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: fetchError,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiHomeAllPages />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: true, error: fetchError }),
    );
  });

  it("passes isError false when the collection loads successfully — paired positive control for the error-forwarding test above", () => {
    mockSearchParams = new URLSearchParams();
    render(<WikiHomeAllPages />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ isError: false }),
    );
  });
});

describe("WikiHomeAllPages — owner display name in list view (task B)", () => {
  it("renders the resolved owner display name in the owner column so the page shows a name not an ID", () => {
    mockSearchParams = new URLSearchParams();
    const row = makeItem(1, { ownerUserId: "user-abc" });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    useOrgMembersByIds.mockReturnValue({
      data: {
        data: [{ userId: "user-abc", name: "Alice Smith", email: "alice@test.com" }],
      },
    });

    render(<WikiHomeAllPages />);
    const cell = renderListCell("owner", row);

    expect(within(cell.container).getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders the owner-missing badge in the owner column when ownerUserId is null so the page is flagged unowned", () => {
    mockSearchParams = new URLSearchParams();
    const row = makeItem(2, { ownerUserId: null });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiHomeAllPages />);
    const cell = renderListCell("owner", row);

    expect(within(cell.container).getByText("Owner missing")).toBeInTheDocument();
  });
});

describe("WikiHomeAllPages — no per-row backlink or linked-record column, because /kb/pages carries no aggregate for either (task I)", () => {
  it("declares no backlinks column, because one fetch per row over a fifty-row page is an N+1 the list projection cannot serve", () => {
    mockSearchParams = new URLSearchParams();
    render(<WikiHomeAllPages />);

    expect(
      lastRenderedListColumns().map((column) => column.key),
    ).not.toContain("backlinks");
  });

  it("declares no linkedRecords column for the same reason as backlinks", () => {
    mockSearchParams = new URLSearchParams();
    render(<WikiHomeAllPages />);

    expect(
      lastRenderedListColumns().map((column) => column.key),
    ).not.toContain("linkedRecords");
  });

  it("does declare the columns the list projection can serve, so the two absences above are not a component that failed to render", () => {
    mockSearchParams = new URLSearchParams();
    render(<WikiHomeAllPages />);

    expect(lastRenderedListColumns().map((column) => column.key)).toEqual([
      "title",
      "status",
      "trustState",
      "owner",
      "updatedAt",
      "actions",
    ]);
  });
});

describe("WikiHomeAllPages — right-click context menu on card view (task G)", () => {
  it("right-clicking a card calls e.preventDefault to suppress the native browser context menu", () => {
    render(<WikiHomeAllPages />);

    const pageActionsBtn = screen.getByRole("button", { name: /page actions/i });
    const notCancelled = fireEvent.contextMenu(pageActionsBtn);

    expect(notCancelled).toBe(false);
  });
});

describe("WikiHomeAllPages — offline indicator reads the shared useOnlineStatus store (task G)", () => {
  it("shows the offline indicator when the browser goes offline", () => {
    render(<WikiHomeAllPages />);

    expect(screen.queryByTestId("offline-indicator")).not.toBeInTheDocument();

    act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
  });

  it("hides the offline indicator when the browser comes back online", () => {
    render(<WikiHomeAllPages />);

    act(() => {
      setNavigatorOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    act(() => {
      setNavigatorOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    expect(screen.queryByTestId("offline-indicator")).not.toBeInTheDocument();
  });

  it("renders the indicator on first paint when navigator is already offline, so a page loaded while offline is not silently stale", () => {
    setNavigatorOnline(false);

    render(<WikiHomeAllPages />);

    expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
  });
});

describe("WikiHomeAllPages — the q URL parameter reaches the collection request (task B)", () => {
  it("sends the trimmed q URL parameter as the collection query so the list filters server-side", () => {
    mockSearchParams = new URLSearchParams("q=%20runbook%20");

    render(<WikiHomeAllPages />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "runbook" }),
    );
  });

  it("sends no q key at all for a whitespace-only q URL parameter, because /kb/pages declares q as min(1) and would answer an empty string with a 400 for the whole list", () => {
    mockSearchParams = new URLSearchParams("q=%20%20");

    render(<WikiHomeAllPages />);

    const params = useKbPageCollection.mock.calls.at(-1)?.[0] as Record<
      string,
      unknown
    >;
    expect(params.q).toBeUndefined();
  });

  it("treats a q URL parameter as an active filter so the empty state offers clear-filters rather than the first-run copy", () => {
    mockSearchParams = new URLSearchParams("q=nothing-matches");
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomeAllPages />);

    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your wiki starts here")).not.toBeInTheDocument();
  });

  it("clear-filters removes q alongside the other filter params in one URL write", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("q=nothing-matches&status=draft");
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomeAllPages />);
    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(url).not.toContain("q=");
    expect(url).not.toContain("status=");
  });
});

describe("WikiHomeAllPages — the cursor is URL-backed so page two is deep-linkable (task C)", () => {
  function lastPagerUrlOptions() {
    const call = useCursorPager.mock.calls.at(-1);
    if (!call) throw new Error("useCursorPager was never called");
    return call[1] as {
      initialCursor: string | undefined;
      onCursorChange: (cursor: string | undefined) => void;
    };
  }

  it("seeds the pager from the cursor URL parameter so a shared page-two link opens on page two", () => {
    mockSearchParams = new URLSearchParams("cursor=cursor-from-url");

    render(<WikiHomeAllPages />);

    expect(lastPagerUrlOptions().initialCursor).toBe("cursor-from-url");
  });

  it("seeds the pager with no cursor when the URL carries none — paired control for the deep-link test above", () => {
    mockSearchParams = new URLSearchParams();

    render(<WikiHomeAllPages />);

    expect(lastPagerUrlOptions().initialCursor).toBeUndefined();
  });

  it("writes the advanced cursor into the URL so the second page can be reloaded and shared", () => {
    mockSearchParams = new URLSearchParams();

    render(<WikiHomeAllPages />);
    act(() => {
      lastPagerUrlOptions().onCursorChange("cursor-page-two");
    });

    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("cursor=cursor-page-two");
  });

  it("writes no URL update when the pager reports the cursor the URL already holds, because an unconditional write from a cursor effect is the render loop this pager was hardened against", () => {
    mockSearchParams = new URLSearchParams("cursor=cursor-page-two");

    render(<WikiHomeAllPages />);
    act(() => {
      lastPagerUrlOptions().onCursorChange("cursor-page-two");
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("drops the cursor parameter in the same router.replace that applies a status filter, so page two of the old filter is never requested under the new one", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("view=card&cursor=cursor-page-two");

    render(<WikiHomeAllPages />);
    await user.click(screen.getByRole("button", { name: /list view/i }));

    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(url).not.toContain("cursor=");
  });

  it("keys the pager reset on q so a new search cannot reuse the previous query's cursor", () => {
    mockSearchParams = new URLSearchParams("q=alpha");
    render(<WikiHomeAllPages />);
    const keyForAlpha = useCursorPager.mock.calls.at(-1)?.[0] as string;

    mockSearchParams = new URLSearchParams("q=beta");
    render(<WikiHomeAllPages />);
    const keyForBeta = useCursorPager.mock.calls.at(-1)?.[0] as string;

    expect(keyForAlpha).not.toBe(keyForBeta);
  });
});
