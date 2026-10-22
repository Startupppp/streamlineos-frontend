import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockExportMutate = jest.fn();
let mockExportPending = false;
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/knowledge/wiki/private",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/kb/shortcuts", () => ({
  useCreateKbShortcut: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: () => ({ mutate: mockExportMutate, isPending: mockExportPending }),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: jest.fn(() =>
    jest
      .requireActual<typeof import("@/test-utils/kb-spaces-fixture")>(
        "@/test-utils/kb-spaces-fixture",
      )
      .kbSpacesQueryStub(),
  ),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useArchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnarchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("./page-grants-sheet", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
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
      onRetry,
    }: {
      resolution: { kind: string };
      loading: React.ReactNode;
      empty?: React.ReactNode;
      children: React.ReactNode;
      onRetry?: () => void;
    }) => {
      if (resolution.kind === "loading") return <>{loading}</>;
      if (resolution.kind === "empty") return <>{empty ?? children}</>;
      if (resolution.kind === "error") {
        const errRes = resolution as unknown as { kind: "error"; error?: { details?: { correlationId?: string } } };
        const corrId = errRes.error?.details?.correlationId;
        return (
          <div role="alert" data-testid="error-state">
            <span>Something went wrong</span>
            {corrId !== undefined && corrId !== "" && <code data-testid="error-reference">{corrId}</code>}
            {onRetry !== undefined && (
              <button type="button" onClick={onRetry} data-testid="retry-button">
                Try again
              </button>
            )}
          </div>
        );
      }
      if (resolution.kind === "denied") {
        return <div data-testid="denied-state">Access denied</div>;
      }
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
  }),
}));

const { useKbPageCollection } = jest.requireMock(
  "@/hooks/api/kb/page-collection",
) as { useKbPageCollection: jest.Mock };

const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};

const { useOrgMembersByIds } = jest.requireMock("@/hooks/api/organization") as {
  useOrgMembersByIds: jest.Mock;
};

const { useOnlineStatus } = jest.requireMock("@/hooks/common/use-online-status") as {
  useOnlineStatus: jest.Mock;
};

function makeItem(id: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Page ${id}`,
    icon: null,
    coverImage: null,
    kind: "document" as const,
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
    boundedCount: { count: items.length, isExact: true },
  };
}

beforeEach(() => {
  mockPush.mockClear();
  mockExportMutate.mockClear();
  mockExportPending = false;
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  useKbPageCollection.mockReturnValue({
    data: makeResponse([makeItem(1)]),
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "ready" });
  useOrgMembersByIds.mockReturnValue({ data: undefined });
  useOnlineStatus.mockReturnValue(true);
});

it("opens the page's version history from its collection action menu", async () => {
  mockSearchParams = new URLSearchParams("view=card");
  const user = userEvent.setup();
  render(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);

  await user.click(screen.getByRole("button", { name: "Page actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Version history" }));

  expect(mockPush).toHaveBeenCalledWith("/knowledge/wiki/doc/1/history");
});

it("copies the selected page URL without navigating away", async () => {
  mockSearchParams = new URLSearchParams("view=card");
  const writeText = jest.fn().mockResolvedValue(undefined);
  const user = userEvent.setup();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);

  await user.click(screen.getByRole("button", { name: "Page actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Copy link" }));

  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/knowledge/wiki/doc/1`);
  expect(mockPush).not.toHaveBeenCalled();
});

it("starts one HTML export and disables the action while it is pending", async () => {
  mockSearchParams = new URLSearchParams("view=card");
  const user = userEvent.setup();
  const view = render(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);

  await user.click(screen.getByRole("button", { name: "Page actions" }));
  await user.click(screen.getByRole("menuitem", { name: "Export HTML" }));
  expect(mockExportMutate).toHaveBeenCalledWith(
    { pageId: 1, format: "html" },
    expect.objectContaining({ onError: expect.any(Function) }),
  );
  expect(mockPush).not.toHaveBeenCalled();

  mockExportPending = true;
  view.rerender(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);
  await user.click(screen.getByRole("button", { name: "Page actions" }));
  expect(screen.getByRole("menuitem", { name: "Export HTML" })).toHaveAttribute("data-disabled");
  expect(mockExportMutate).toHaveBeenCalledTimes(1);
});

describe("WikiPageCollectionTable — filter and empty states", () => {
  it("shows first-empty state without clear-filters button when no filters are active", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByText("No pages yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("shows filtered-empty state with clear-filters button when a filter is active but result is empty", () => {
    mockSearchParams = new URLSearchParams("q=nonexistent");
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(
      screen.getByText("No results match your filters."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
  });

  it("filtered-empty renders differently from first-empty — filtered offers clear action that first-empty does not", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    mockSearchParams = new URLSearchParams("status=draft");
    const { rerender } = render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );
    expect(
      screen.getByRole("button", { name: /clear filters/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();

    mockSearchParams = new URLSearchParams();
    rerender(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("No pages yet")).toBeInTheDocument();
  });

  it("shows access-lost state when data was present and is now empty with no active filters", () => {
    useKbPageCollection.mockReturnValueOnce({
      data: makeResponse([makeItem(1)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValueOnce({ kind: "ready" });

    const { rerender } = render(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );

    expect(
      screen.queryByText("Your access may have changed"),
    ).not.toBeInTheDocument();

    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    rerender(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );

    expect(
      screen.getByText("Your access may have changed"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Nothing shared with you"),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /refresh/i })).toBeInTheDocument();
  });

  it("access-lost state does NOT appear when filters are active — that case is filtered-empty", () => {
    mockSearchParams = new URLSearchParams("q=something");

    useKbPageCollection.mockReturnValueOnce({
      data: makeResponse([makeItem(1)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValueOnce({ kind: "ready" });

    const { rerender } = render(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );

    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    rerender(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );

    expect(
      screen.queryByText("Your access may have changed"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("No results match your filters."),
    ).toBeInTheDocument();
  });
});

describe("WikiPageCollectionTable — cursor pagination", () => {
  it("offers the previous page when a later cursor page becomes empty", async () => {
    const user = userEvent.setup();
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-abc" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    const view = render(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );
    await user.click(screen.getByRole("button", { name: /next page/i }));

    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });
    view.rerender(
      <WikiPageCollectionTable
        fixedParams={{ sharedWithMe: "1" }}
        emptyTitle="Nothing shared with you"
        accessLostTitle="Your access may have changed"
      />,
    );

    expect(screen.getByText("No files on this page")).toBeInTheDocument();
    expect(screen.queryByText("Your access may have changed")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });

  it("advances cursor to next page without losing the sort filter from the URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("sort=title_asc");

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-abc" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages"
      />,
    );

    const nextButton = screen.getByRole("button", { name: /next page/i });
    await user.click(nextButton);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "title_asc", cursor: "cursor-abc" }),
    );
  });

  it("retreats cursor to first page without losing the sort filter from the URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("sort=created_desc");

    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], { hasMore: true, nextCursor: "cursor-xyz" }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages"
      />,
    );

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
    expect(lastCall.sort).toBe("created_desc");
    expect(lastCall.cursor).toBeUndefined();
  });
});

describe("WikiPageCollectionTable — owner filter", () => {
  it("passes owner: \"me\" to the collection query when the URL carries owner=me", () => {
    mockSearchParams = new URLSearchParams("owner=me");

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner: "me" }),
    );
  });

  it("passes owner: undefined when the URL carries no owner param, so the table shows everyone's pages by default", () => {
    mockSearchParams = new URLSearchParams();

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ owner: undefined }),
    );
  });

  it("renders an Owner selector when the table's owner is not pinned by the caller", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams();

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    await user.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(screen.getByRole("combobox", { name: /^owner$/i })).toBeInTheDocument();
    expect(screen.getByText("Anyone")).toBeInTheDocument();
  });

  it("hides the Owner selector when the caller already pins owner, e.g. a dedicated My Pages view", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams();

    render(
      <WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />,
    );

    await user.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(screen.queryByRole("combobox", { name: /^owner$/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Anyone")).not.toBeInTheDocument();
  });
});

describe("WikiPageCollectionTable — kind filter", () => {
  it("passes kind: \"document\" to the collection query when the URL carries kind=document", () => {
    mockSearchParams = new URLSearchParams("kind=document");

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "document" }),
    );
  });

  it("passes kind: \"spreadsheet\" to the collection query when the URL carries kind=spreadsheet", () => {
    mockSearchParams = new URLSearchParams("kind=spreadsheet");

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "spreadsheet" }),
    );
  });

  it("passes kind: undefined when the URL carries no kind param, so unfiltered lists include both types", () => {
    mockSearchParams = new URLSearchParams();

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: undefined }),
    );
  });

  it("renders the Type selector so the user can choose between document and spreadsheet", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams();

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    await user.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(screen.getByRole("combobox", { name: /type/i })).toBeInTheDocument();
  });

  it("reflects the active kind in the Type selector when kind=spreadsheet is in the URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("kind=spreadsheet");

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    await user.click(screen.getByRole("button", { name: /filters \(1 active\)/i }));
    const trigger = screen.getByRole("combobox", { name: /type/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toMatch(/spreadsheet/i);
  });
});

