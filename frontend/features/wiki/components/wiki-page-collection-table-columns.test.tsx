import { render, screen } from "@testing-library/react";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import { kbSpacesQueryStub } from "@/test-utils/kb-spaces-fixture";

const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => "/knowledge/wiki/private",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/kb/page-collection", () => ({
  useKbPageCollection: jest.fn(),
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbSpaces: jest.fn(() =>
    jest
      .requireActual<typeof import("@/test-utils/kb-spaces-fixture")>(
        "@/test-utils/kb-spaces-fixture",
      )
      .kbSpacesQueryStub(),
  ),
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
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

const { useKbSpaces } = jest.requireMock("@/hooks/api/kb") as {
  useKbSpaces: jest.Mock;
};

const { useOrgMembersByIds } = jest.requireMock("@/hooks/api/organization") as {
  useOrgMembersByIds: jest.Mock;
};

const { useOnlineStatus } = jest.requireMock("@/hooks/common/use-online-status") as {
  useOnlineStatus: jest.Mock;
};

const { DataTable } = jest.requireMock("@/components/ui/data-table") as {
  DataTable: jest.Mock;
};

type ListRow = ReturnType<typeof makeItem>;

function lastRenderedListColumns() {
  const lastCall = DataTable.mock.calls.at(-1);
  if (!lastCall) throw new Error("DataTable was never rendered");
  const props = lastCall[0] as { columns: { key: string; cell: (row: ListRow) => React.ReactNode }[] };
  return props.columns;
}

function renderListCell(columnKey: string, row: ListRow) {
  const column = lastRenderedListColumns().find((c) => c.key === columnKey);
  if (!column) throw new Error(`No column named ${columnKey}`);
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
    kind: "document",
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

beforeEach(() => {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
  DataTable.mockClear();
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

describe("WikiPageCollectionTable — space filter", () => {
  afterEach(() => {
    useKbSpaces.mockReturnValue(kbSpacesQueryStub());
  });

  it("builds its options from the cursor envelope useKbSpaces returns, so the selected space shows its name", () => {
    mockSearchParams = new URLSearchParams("space=2");

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages yet" />);

    const trigger = screen.getByRole("combobox", { name: "Team folder" });
    expect(trigger).toHaveTextContent("Product");
  });

  it("renders no space filter when the viewer belongs to no space — the control is data-driven, so the positive above is not free", () => {
    mockSearchParams = new URLSearchParams("space=2");
    useKbSpaces.mockReturnValue(kbSpacesQueryStub([]));

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages yet" />);

    expect(screen.queryByRole("combobox", { name: "Team folder" })).not.toBeInTheDocument();
  });
});

describe("WikiPageCollectionTable — owner column", () => {
  it("renders the resolved owner display name in the owner column so the page shows a name not an ID", () => {
    const row = makeItem(1, { ownerUserId: "user-abc" });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    useOrgMembersByIds.mockReturnValue({
      data: { data: [{ userId: "user-abc", name: "Alice Smith", email: "alice@test.com" }] },
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    const cell = renderListCell("owner", row);

    expect(cell.getByText("Alice Smith")).toBeInTheDocument();
  });

  it("renders the owner-missing badge in the owner column when ownerUserId is null", () => {
    const row = makeItem(2, { ownerUserId: null });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    const cell = renderListCell("owner", row);

    expect(cell.getByText(/owner missing/i)).toBeInTheDocument();
  });

  it("declares no backlinks column — one fetch per row over a fifty-row page is an N+1 the list projection cannot serve", () => {
    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    expect(lastRenderedListColumns().map((c) => c.key)).not.toContain("backlinks");
  });

  it("declares no linkedRecords column for the same reason as backlinks", () => {
    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    expect(lastRenderedListColumns().map((c) => c.key)).not.toContain("linkedRecords");
  });

  it("declares the columns the list projection can serve including the owner column", () => {
    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    expect(lastRenderedListColumns().map((c) => c.key)).toEqual([
      "title",
      "status",
      "trustState",
      "owner",
      "updatedAt",
      "actions",
    ]);
  });
});

describe("WikiPageCollectionTable — offline indicator", () => {
  it("shows the offline indicator when the browser is offline", () => {
    useOnlineStatus.mockReturnValue(false);
    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    expect(screen.getByTestId("offline-indicator")).toBeInTheDocument();
  });

  it("hides the offline indicator when the browser is online", () => {
    useOnlineStatus.mockReturnValue(true);
    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    expect(screen.queryByTestId("offline-indicator")).not.toBeInTheDocument();
  });
});

describe("WikiPageCollectionTable — document count display", () => {
  it("renders the exact page count when boundedCount.isExact is true", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1), makeItem(2)], {}, { count: 2, isExact: true }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(screen.getByText("2 documents")).toBeInTheDocument();
  });

  it("renders the bounded count with a plus sign when boundedCount.isExact is false", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1)], {}, { count: 50, isExact: false }),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);

    expect(screen.getByText("50+ documents")).toBeInTheDocument();
  });
});

describe("WikiPageCollectionTable — cursor URL param", () => {
  it("seeds the pager from the cursor URL parameter so a shared page-two link opens on page two", () => {
    mockSearchParams = new URLSearchParams("cursor=cursor-abc");

    render(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "cursor-abc" }),
    );
  });

  it("seeds the pager with no cursor when the URL carries none — paired control for the deep-link test above", () => {
    mockSearchParams = new URLSearchParams();

    render(<WikiPageCollectionTable fixedParams={{ owner: "me" }} emptyTitle="No pages" />);

    expect(useKbPageCollection).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: undefined }),
    );
  });
});

describe("WikiPageCollectionTable — onItemCountChange callback", () => {
  it("calls onItemCountChange with the row count when data loads", () => {
    const handleItemCountChange = jest.fn();
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1), makeItem(2), makeItem(3)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(
      <WikiPageCollectionTable
        fixedParams={{}}
        emptyTitle="No pages"
        onItemCountChange={handleItemCountChange}
      />,
    );

    expect(handleItemCountChange).toHaveBeenCalledWith(3);
  });
});

describe("WikiPageCollectionTable — kind indicator", () => {
  it("shows a spreadsheet icon in the title cell for a spreadsheet page", () => {
    const row = makeItem(99, { kind: "spreadsheet", title: "Budget sheet" });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    const cell = renderListCell("title", row);

    expect(cell.getByLabelText("Spreadsheet")).toBeInTheDocument();
  });

  it("shows no spreadsheet icon for a document page", () => {
    const row = makeItem(98, { kind: "document", title: "Policy doc" });
    useKbPageCollection.mockReturnValue({
      data: makeResponse([row]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<WikiPageCollectionTable fixedParams={{}} emptyTitle="No pages" />);
    const cell = renderListCell("title", row);

    expect(cell.queryByLabelText("Spreadsheet")).not.toBeInTheDocument();
  });
});
