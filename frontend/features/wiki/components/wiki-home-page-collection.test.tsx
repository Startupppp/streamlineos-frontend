import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WikiHomePage from "./wiki-home-page";
import { kbSpacesQueryStub } from "@/test-utils/kb-spaces-fixture";

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
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(() => ({ data: [] })),
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

jest.mock("@/hooks/api/kb/hr-link-config", () => ({
  useHrKbLinkFlags: () => ({ link: false, search: false, ai: false }),
}));

jest.mock("@/hooks/api/kb/linked-documents", () => ({
  useLinkedDocuments: () => ({ data: undefined }),
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

describe("WikiHomePage — keyboard handler wiring (task F)", () => {
  beforeEach(() => {
    mockUseBuildListKeyboard.mockClear();
  });

  it("passes the real item count from the collection to useBuildListKeyboard so j/k/Enter work", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([makeItem(1), makeItem(2), makeItem(3)]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiHomePage />);

    const options = lastKeyboardOptions();
    expect(options.itemCount).toBe(3);
  });

  it("passes itemCount 0 when the collection is empty so j/k are inert on an empty list", () => {
    useKbPageCollection.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiHomePage />);

    const options = lastKeyboardOptions();
    expect(options.itemCount).toBe(0);
  });

  it("passes a real onOpen handler so Enter navigates to the page at the focused index", () => {
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(typeof options.onOpen).toBe("function");
    const onOpen = options.onOpen as (index: number) => void;
    onOpen(0);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("1"));
  });

  it("search input is present for the non-project-scoped wiki so / can focus it", () => {
    render(<WikiHomePage />);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("search input is also present for the project-scoped wiki now that it has been added", () => {
    render(<WikiHomePage projectId={7} />);
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("passes onEdit so the e key opens the focused page, which on this surface is the editor because the wiki document has no separate edit route", () => {
    render(<WikiHomePage />);
    const options = lastKeyboardOptions();
    expect(typeof options.onEdit).toBe("function");
    const onEdit = options.onEdit as (index: number) => void;
    onEdit(0);
    expect(mockPush).toHaveBeenCalledWith(expect.stringContaining("1"));
  });
});

async function settleSearchDebounce() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
}

describe("WikiHomePage — project-scoped search writes a debounced q to the URL (task B)", () => {
  it("renders a project-scoped search box that types into the q URL parameter rather than navigating out of the project", async () => {
    const user = userEvent.setup();
    render(<WikiHomePage projectId={7} />);

    await user.type(screen.getByRole("searchbox"), "runbook");
    await settleSearchDebounce();

    expect(mockReplace).toHaveBeenCalledWith(
      expect.stringContaining("q=runbook"),
      expect.objectContaining({ scroll: false }),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("writes nothing to the URL before the debounce settles, so the collection is not refetched once per keystroke", async () => {
    const user = userEvent.setup();
    render(<WikiHomePage projectId={7} />);

    await user.type(screen.getByRole("searchbox"), "runbook");

    expect(mockReplace).not.toHaveBeenCalled();

    await settleSearchDebounce();

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("writes no q key for a whitespace-only query, because /kb/pages declares q as min(1) and an empty q would 400 the whole list", async () => {
    const user = userEvent.setup();
    render(<WikiHomePage projectId={7} />);

    await user.type(screen.getByRole("searchbox"), "   ");
    await settleSearchDebounce();

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("drops the cursor parameter in the same URL write as the query, so a search cannot inherit the previous result set's page-two cursor", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams("cursor=stale-cursor");
    render(<WikiHomePage projectId={7} />);

    await user.type(screen.getByRole("searchbox"), "runbook");
    await settleSearchDebounce();

    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("q=runbook");
    expect(url).not.toContain("cursor=");
  });

  it("seeds the search box from the q URL parameter so a shared search link shows its own query", () => {
    mockSearchParams = new URLSearchParams("q=runbook");
    render(<WikiHomePage projectId={7} />);

    expect(screen.getByRole("searchbox")).toHaveValue("runbook");
  });

  it("leaves the organization-wide wiki search on its deliberate redirect to the full KB search route instead of writing q", async () => {
    const user = userEvent.setup();
    render(<WikiHomePage />);

    await user.type(screen.getByRole("searchbox"), "runbook{Enter}");
    await settleSearchDebounce();

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/search?q=runbook"),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
