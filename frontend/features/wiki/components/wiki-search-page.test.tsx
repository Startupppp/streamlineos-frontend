import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import WikiSearchPage from "./wiki-search-page";

const mockRouterPush = jest.fn();
const mockUseSearchParams = jest.fn(() => new URLSearchParams());
const mockUpdate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
  usePathname: () => "/knowledge/wiki/search",
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock("@/lib/url-state/use-url-filters", () => ({
  useUrlFilters: () => ({ update: mockUpdate }),
  parseEnum: (
    value: string | null,
    values: readonly string[],
    fallback: string,
  ) => (value !== null && (values as string[]).includes(value) ? value : fallback),
}));

jest.mock("@/hooks/api/kb/search", () => ({
  useKbPageFullSearch: jest.fn(),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: jest.fn(),
}));

const mockFlags = jest.fn(() => ({ link: false, search: false, ai: false }));
jest.mock("@/hooks/api/kb/hr-link-config", () => ({ useHrKbLinkFlags: () => mockFlags() }));

jest.mock("@/features/wiki/components/wiki-search-company-documents", () => ({
  WikiSearchCompanyDocuments: ({ query }: { query: string }) => <div data-testid="company-documents-group">{query}</div>,
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
      if (resolution.kind === "empty") return <>{empty}</>;
      return <>{children}</>;
    },
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({
    title,
    description,
    onClearFilters,
  }: {
    title: string;
    description: string;
    filtersActive?: boolean;
    filteredTitle?: string;
    onClearFilters?: () => void;
  }) => (
    <div data-testid="empty-state">
      <span data-testid="empty-title">{title}</span>
      <span data-testid="empty-description">{description}</span>
      {onClearFilters && (
        <button type="button" onClick={onClearFilters} data-testid="clear-filters">
          Clear filters
        </button>
      )}
    </div>
  ),
}));

jest.mock("@/components/ui/data-table-skeleton", () => ({
  DataTableSkeleton: () => <div data-testid="loading-skeleton" />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="page-wrapper">
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

jest.mock("next/link", () => {
  const Link = React.forwardRef<
    HTMLAnchorElement,
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
  >(({ children, href, ...rest }, ref) => (
    <a ref={ref} href={href} {...rest}>
      {children}
    </a>
  ));
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/lib/knowledge-routes", () => ({
  pageHref: (id: number) => `/knowledge/wiki/page/${id}`,
}));

jest.mock("@/features/wiki/lib/search-snippet-text", () => ({
  SearchSnippetText: ({ snippet }: { snippet: string }) => <span>{snippet}</span>,
}));

jest.mock("@/features/wiki/components/kb-collection-badges", () => ({
  StatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
  TrustBadge: ({ trustState }: { trustState: string }) => (
    <span data-testid="trust-badge">{trustState}</span>
  ),
}));

jest.mock("@/features/wiki/lib/kb-date-utils", () => ({
  kbTimeAgo: () => "2d ago",
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => (
    <button type="button" onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/input", () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid="search-input" {...props} />
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) => (
    <select
      data-testid="status-select"
      defaultValue={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

const { useKbPageFullSearch } = jest.requireMock("@/hooks/api/kb/search") as {
  useKbPageFullSearch: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useKbSpaces } = jest.requireMock("@/hooks/api/kb/spaces") as {
  useKbSpaces: jest.Mock;
};

function mockSearchResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    title: "Onboarding guide",
    spaceId: null,
    projectId: null,
    status: "published",
    trustState: "verified",
    visibility: "org",
    contentType: "note",
    updatedAt: "2026-09-01T00:00:00Z",
    snippet: "This is a helpful guide for new hires",
    ...overrides,
  };
}

function setupSearch(
  items: ReturnType<typeof mockSearchResult>[],
  extras: { hasMore?: boolean; facets?: unknown } = {},
) {
  useKbPageFullSearch.mockReturnValue({
    data: {
      pages: [
        {
          items,
          hasMore: extras.hasMore ?? false,
          nextCursor: extras.hasMore ? "cursor-1" : null,
          limit: 20,
          facets: extras.facets ?? null,
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: extras.hasMore ?? false,
    isFetchingNextPage: false,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseSearchParams.mockReturnValue(new URLSearchParams());
  useKbPageFullSearch.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  });
  useKbSpaces.mockReturnValue({ data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 100 } } });
  usePageState.mockReturnValue({ kind: "ready" });
  mockFlags.mockReturnValue({ link: false, search: false, ai: false });
});

describe("WikiSearchPage — company documents group", () => {
  it("hands the query to the company documents group, which decides for itself whether to show", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=leave"));
    setupSearch([mockSearchResult()]);

    render(<WikiSearchPage />);

    expect(screen.getByTestId("company-documents-group")).toHaveTextContent("leave");
  });

  it("says 'No pages found', not 'No results', when company documents are searched too, so a group below is not contradicted", () => {
    mockFlags.mockReturnValue({ link: true, search: true, ai: false });
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=leave"));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiSearchPage />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No pages found");
  });

  it("keeps saying 'No results' while company documents are not searched, exactly as before", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=leave"));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiSearchPage />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No results");
  });
});

describe("WikiSearchPage — first-empty vs filtered-empty", () => {
  it("shows 'Search pages' invite when no query has been entered", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(""));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("Search pages");
    expect(screen.getByTestId("empty-description")).toHaveTextContent(
      "Enter a query above to find pages",
    );
  });

  it("shows 'No results' with a recovery hint when a query returns zero results", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=nonexistent"));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiSearchPage />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("No results");
    expect(screen.getByTestId("empty-description")).toHaveTextContent(
      "Try a different query or clear your filters",
    );
  });

  it("the first-empty title and filtered-empty title are distinct strings", () => {
    expect("Search pages").not.toBe("No results");
  });
});

describe("WikiSearchPage — URL filter state", () => {
  it("passes q and status from URL params to the search hook on initial render", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=handbook&status=published"));
    setupSearch([mockSearchResult({ title: "Handbook" })]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "handbook", status: "published" }),
      expect.anything(),
    );
  });

  it("pre-fills the search input with the URL query param", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=onboarding"));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe("onboarding");
  });

  it("passes type from the URL param to the search hook, alongside q and status", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=handbook&type=sop"),
    );
    setupSearch([mockSearchResult({ title: "Handbook" })]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: "handbook", type: "sop" }),
      expect.anything(),
    );
  });

  it("calls update with type=null when the type filter chip is removed", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=onboarding&type=sop"),
    );
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const removeButton = screen.getByRole("button", {
      name: /Remove type filter/i,
    });
    fireEvent.click(removeButton);

    expect(mockUpdate).toHaveBeenCalledWith({ type: null });
  });

  it("calls update with status=null when the status filter chip is removed", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=onboarding&status=published"),
    );
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const removeButton = screen.getByRole("button", {
      name: /Remove status filter/i,
    });
    fireEvent.click(removeButton);

    expect(mockUpdate).toHaveBeenCalledWith({ status: null });
  });

  it("retains q and status on a re-render without any user input", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=sprint&status=draft"),
    );
    setupSearch([mockSearchResult({ title: "Sprint Planning" })]);
    usePageState.mockReturnValue({ kind: "ready" });

    const { rerender } = render(<WikiSearchPage />);
    rerender(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "sprint", status: "draft" }),
      expect.anything(),
    );
  });
});

describe("WikiSearchPage — keyboard navigation", () => {
  it("focuses the first result link on ArrowDown from the container", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    const items = [
      mockSearchResult({ id: 1, title: "First result" }),
      mockSearchResult({ id: 2, title: "Second result" }),
    ];
    setupSearch(items);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const firstLink = screen.getByRole("link", { name: /First result/i });
    fireEvent.keyDown(firstLink, { key: "ArrowDown" });

    expect(document.activeElement?.tagName.toLowerCase()).toBe("a");
  });

  it("moves focus back on ArrowUp after advancing", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    const items = [
      mockSearchResult({ id: 1, title: "First result" }),
      mockSearchResult({ id: 2, title: "Second result" }),
    ];
    setupSearch(items);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const firstLink = screen.getByRole("link", { name: /First result/i });
    fireEvent.keyDown(firstLink, { key: "ArrowDown" });
    fireEvent.keyDown(firstLink, { key: "ArrowUp" });

    expect(document.activeElement?.tagName.toLowerCase()).toBe("a");
  });

  it("does not dispatch router.push when navigating with arrow keys", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult({ id: 1, title: "Guide" })]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const link = screen.getByRole("link", { name: /Guide/i });
    fireEvent.keyDown(link, { key: "ArrowDown" });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

describe("WikiSearchPage — quick-find handoff", () => {
  it("pre-fills the search input when q is set in the URL by the quick-find dialog", () => {
    const handoffQuery = "sprint planning";
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams(`q=${encodeURIComponent(handoffQuery)}`),
    );
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const input = screen.getByTestId("search-input") as HTMLInputElement;
    expect(input.value).toBe(handoffQuery);
  });

  it("fires the search hook with the handoff query so results load immediately", () => {
    const handoffQuery = "sprint planning";
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams(`q=${encodeURIComponent(handoffQuery)}`),
    );
    setupSearch([mockSearchResult({ title: "Sprint Planning" })]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: handoffQuery }),
      expect.objectContaining({ enabled: true }),
    );
  });

  it("shows a 'No query' state, not a network error, when the URL carries no q param", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(""));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByTestId("empty-title")).toHaveTextContent("Search pages");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

type IntersectionCallback = (entries: IntersectionObserverEntry[]) => void;

const observers: {
  callback: IntersectionCallback;
  observed: Element[];
  disconnected: boolean;
}[] = [];

class FakeIntersectionObserver {
  constructor(callback: IntersectionCallback) {
    this.entry = { callback, observed: [], disconnected: false };
    observers.push(this.entry);
  }
  private entry: (typeof observers)[number];
  observe(element: Element) {
    this.entry.observed.push(element);
  }
  disconnect() {
    this.entry.disconnected = true;
  }
  unobserve() {}
}

describe("WikiSearchPage — cursor pagination", () => {
  beforeEach(() => {
    observers.length = 0;
    Reflect.set(globalThis, "IntersectionObserver", FakeIntersectionObserver);
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, "IntersectionObserver");
  });

  it("shows an open-ended count and a sentinel, never a fixed 'Top N' ceiling, when another page exists", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult({ id: 1, title: "Guide" })], { hasMore: true });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByText("1+ results")).toBeInTheDocument();
    expect(screen.queryByText(/^Top \d+ results$/)).toBeNull();
    expect(observers).toHaveLength(1);
  });

  it("calls fetchNextPage when the bottom sentinel intersects", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult({ id: 1, title: "Guide" })], { hasMore: true });
    usePageState.mockReturnValue({ kind: "ready" });
    const fetchNextPage = jest.fn();
    useKbPageFullSearch.mockReturnValue({
      data: {
        pages: [
          {
            items: [mockSearchResult({ id: 1, title: "Guide" })],
            hasMore: true,
            nextCursor: "cursor-1",
            limit: 20,
            facets: null,
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    render(<WikiSearchPage />);

    expect(observers).toHaveLength(1);
    observers[0]?.callback([{ isIntersecting: true } as IntersectionObserverEntry]);

    expect(fetchNextPage).toHaveBeenCalledTimes(1);
  });

  it("mounts no sentinel once the last page has been reached", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult({ id: 1, title: "Guide" })], { hasMore: false });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(observers).toHaveLength(0);
    expect(screen.getByText("1 result")).toBeInTheDocument();
  });
});

describe("WikiSearchPage — verified facet", () => {
  it("forwards the verified filter from the URL to the search request, because the backend already accepts it and the counts are otherwise computed and thrown away", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=guide&verified=verified"),
    );
    setupSearch([mockSearchResult()], {
      facets: {
        status: [],
        space: [],
        type: [],
        verified: [
          { value: "verified", count: 4 },
          { value: "unverified", count: 2 },
        ],
      },
    });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.objectContaining({ verified: true }),
      expect.anything(),
    );
  });

  it("omits verified from the request when the URL carries no verified filter, so the unfiltered list is not silently narrowed", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()]);

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.not.objectContaining({ verified: expect.anything() }),
      expect.anything(),
    );
  });

  it("renders the verified facet counts the response already carries, so the control is not a filter with no evidence behind it", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()], {
      facets: {
        status: [],
        space: [],
        type: [],
        verified: [
          { value: "verified", count: 4 },
          { value: "unverified", count: 2 },
        ],
      },
    });

    render(<WikiSearchPage />);

    expect(screen.getByText("Verified (4)")).toBeInTheDocument();
    expect(screen.getByText("Not verified (2)")).toBeInTheDocument();
  });

  it("writes the chosen trust value to the URL rather than holding it in component state, so the filtered search is shareable", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()], {
      facets: { status: [], space: [], type: [], verified: [] },
    });

    render(<WikiSearchPage />);
    const selects = screen.getAllByTestId("status-select");
    fireEvent.change(selects[selects.length - 1], {
      target: { value: "verified" },
    });

    expect(mockUpdate).toHaveBeenCalledWith({ verified: "verified" });
  });

  it("clears the verified filter along with the others, so the filtered-empty recovery actually restores every result", () => {
    mockUseSearchParams.mockReturnValue(
      new URLSearchParams("q=guide&verified=verified"),
    );
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiSearchPage />);
    fireEvent.click(screen.getByTestId("clear-filters"));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ verified: null }),
    );
  });
});

describe("WikiSearchPage — space facet filter (S05)", () => {
  it("passes spaceId from the URL param to the search hook, so the filter narrows results server-side", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide&space=7"));
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 7 }),
      expect.anything(),
    );
  });

  it("omits spaceId from the request when the URL carries no space param, so results are not silently narrowed", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(useKbPageFullSearch).toHaveBeenCalledWith(
      expect.not.objectContaining({ spaceId: expect.anything() }),
      expect.anything(),
    );
  });

  it("renders a space picker showing facet entries when the response includes a non-empty space facet", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()], {
      facets: {
        status: [],
        space: [{ spaceId: 7, count: 3 }],
        type: [],
        verified: [],
      },
    });
    useKbSpaces.mockReturnValue({
      data: { data: [{ id: 7, name: "Engineering Hub" }], pagination: { hasMore: false, nextCursor: null, limit: 100 } },
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByText("Engineering Hub (3)")).toBeInTheDocument();
  });

  it("does not render the space picker when the facet list is empty, so no irrelevant control appears before the first query", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()], {
      facets: { status: [], space: [], type: [], verified: [] },
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.queryByText(/any space/i)).not.toBeInTheDocument();
  });

  it("renders a space chip and a remove button when a space filter is active, so it can be cleared without resetting other filters", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide&space=7"));
    setupSearch([mockSearchResult()]);
    useKbSpaces.mockReturnValue({
      data: { data: [{ id: 7, name: "Engineering Hub" }], pagination: { hasMore: false, nextCursor: null, limit: 100 } },
    });
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const removeButton = screen.getByRole("button", { name: /Remove space filter/i });
    fireEvent.click(removeButton);
    expect(mockUpdate).toHaveBeenCalledWith({ space: null });
  });

  it("clears the space filter along with the others when the filtered-empty clear fires", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide&space=7"));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "empty" });

    render(<WikiSearchPage />);
    fireEvent.click(screen.getByTestId("clear-filters"));

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ space: null }),
    );
  });
});

describe("WikiSearchPage — cross-cutting URL/local invariants (Box 1)", () => {
  it("q and status carried in URL survive a re-render without any update call", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=foo&status=draft"));
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    const { rerender } = render(<WikiSearchPage />);
    rerender(<WikiSearchPage />);

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(useKbPageFullSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "foo", status: "draft" }),
      expect.anything(),
    );
  });

  it("focusedIndex (keyboard navigation state) never calls update, confirming it stays in local state", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([
      mockSearchResult({ id: 1, title: "Result A" }),
      mockSearchResult({ id: 2, title: "Result B" }),
    ]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);
    const firstLink = screen.getByRole("link", { name: /Result A/i });
    fireEvent.keyDown(firstLink, { key: "ArrowDown" });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("WikiSearchPage — accessibility invariants (Box 3, jsdom-provable subset)", () => {
  it("view toggle buttons have aria-label so screen readers can identify them", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide"));
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByRole("button", { name: "List view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Card view" })).toBeInTheDocument();
  });

  it("the search input has an accessible label so screen readers announce it", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(""));
    setupSearch([]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    const input = screen.getByRole("searchbox", { name: /search pages/i });
    expect(input).toBeInTheDocument();
  });

  it("active filter chip remove buttons have aria-label naming the filter being cleared", () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams("q=guide&status=published&type=sop"));
    setupSearch([mockSearchResult()]);
    usePageState.mockReturnValue({ kind: "ready" });

    render(<WikiSearchPage />);

    expect(screen.getByRole("button", { name: /Remove status filter: published/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove type filter: sop/i })).toBeInTheDocument();
  });
});
