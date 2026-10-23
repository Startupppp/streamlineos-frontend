import { render, screen } from "@testing-library/react";
import { WikiPageCollectionTable } from "./wiki-page-collection-table";
import { ApiError } from "@/lib/api-envelope";

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

const { DataTable } = jest.requireMock("@/components/ui/data-table") as {
  DataTable: jest.Mock;
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
    isLocked: false,
    can: { edit: true, manage: true },
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

describe("WikiPageCollectionTable — My files six states (S02 evidence)", () => {
  it("loading: renders the data table skeleton while the server call is in-flight", () => {
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "loading" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("table-rows")).not.toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
  });

  it("ready: renders page rows when the server returns owned pages", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1), makeItem(2)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByTestId("table-rows")).toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
  });

  it("first-empty: renders the empty title without a clear-filters button when no filters are active", () => {
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
        emptyDescription="Files you own will appear here."
      />,
    );

    expect(screen.getByText("No pages yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear filters/i })).not.toBeInTheDocument();
  });

  it("filtered-empty: renders a different title and a clear-filters button when a filter is active but result is empty", () => {
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

    expect(screen.getByText("No results match your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
  });

  it("error: renders an error state with a retry button when the server call fails", () => {
    const error = new Error("Failed to fetch");
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.getByTestId("retry-button")).toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
  });

  it("error with request id: renders the correlation id when the api error carries one, so the user can quote it to support", () => {
    const error = new ApiError("Server error", 500, "INTERNAL", { correlationId: "req-abc-12345" });
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByTestId("error-reference")).toHaveTextContent("req-abc-12345");
    expect(screen.getByTestId("retry-button")).toBeInTheDocument();
  });

  it("denied: renders the access-denied state without any page data or empty state copy", () => {
    useKbPageCollection.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "denied", permission: "kb:pages:view" });

    render(
      <WikiPageCollectionTable
        fixedParams={{ owner: "me" }}
        emptyTitle="No pages yet"
      />,
    );

    expect(screen.getByTestId("denied-state")).toBeInTheDocument();
    expect(screen.queryByText("No pages yet")).not.toBeInTheDocument();
    expect(screen.queryByTestId("table-rows")).not.toBeInTheDocument();
  });
});
