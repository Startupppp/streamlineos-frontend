import { render, screen, within } from "@testing-library/react";
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
  useKbSpaces: jest.fn(() => ({ data: [], isLoading: false, isError: false })),
  useCreateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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
