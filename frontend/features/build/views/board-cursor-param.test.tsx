import { act, renderHook } from "@testing-library/react";

let mockSearchParams = new URLSearchParams();
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => "/build/1/issues",
}));

const viewsState: { data: unknown[] } = { data: [] };

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: () => ({
    data: { id: 1, key: "TEST", name: "Test", members: [], statuses: [] },
  }),
}));

jest.mock("@/hooks/api/build/views", () => ({
  useViews: () => ({
    data: { data: viewsState.data, pagination: { limit: 100, hasMore: false, nextCursor: null } },
  }),
  useCreateView: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateView: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/build/tickets", () => ({
  useProjectBoardTickets: () => ({
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    isTruncated: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  }),
}));

jest.mock("@/hooks/api/build/bugs", () => ({
  useBugs: () => ({ data: undefined, isLoading: false }),
}));

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => "unscoped:",
  orgScopedStorageKey: (name: string, scope: string) => `${scope}:${name}`,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

import { useBoardFilterParams } from "./board-filter-params";
import { useTicketFilterParams } from "../shared/use-ticket-filter-params";
import { useModuleFilterParam } from "./use-module-filter-param";
import { useBoardUrlState } from "./use-board-url-state";
import type { ProjectView } from "@/types/projects";
import { DEFAULT_DISPLAY_OPTIONS } from "./display-options-model";

function setUrl(query: string) {
  mockSearchParams = new URLSearchParams(query);
  window.history.replaceState({}, "", query ? `/build/1/issues?${query}` : "/build/1/issues");
}

function lastParams(): URLSearchParams {
  const url = String(mockReplace.mock.calls.at(-1)?.[0] ?? "");
  const idx = url.indexOf("?");
  return new URLSearchParams(idx >= 0 ? url.slice(idx + 1) : "");
}

const SAVED_VIEW: ProjectView = {
  id: 42,
  projectId: 1,
  orgId: "org-1",
  createdBy: "user-1",
  name: "My View",
  filters: { priority: "HIGH" },
  groupBy: null,
  orderBy: null,
  layoutType: "list",
  isPinned: false,
  visibility: "private",
  scope: "project",
  displayOptions: {},
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("the board's cursor lives in the URL", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    viewsState.data = [];
    setUrl("");
  });

  it("reads a deep-linked cursor into the read's filters, so a shared position is fetched", () => {
    setUrl("cursor=c-900");
    const { result } = renderHook(() => useBoardFilterParams());

    expect(result.current.cursor).toBe("c-900");
    expect(result.current.boardFilters.cursor).toBe("c-900");
  });

  it("sends no cursor when the URL carries none, rather than an empty one", () => {
    setUrl("status=OPEN");
    const { result } = renderHook(() => useBoardFilterParams());

    expect(result.current.cursor).toBe("");
    expect(result.current.boardFilters.cursor).toBeUndefined();
  });

  it("does not count the cursor as an active filter, so a shared link is not a filtered-empty state", () => {
    setUrl("cursor=c-900");
    const { result } = renderHook(() => useBoardFilterParams());

    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.activeFilters).toEqual({});
  });
});

describe("shape writers drop cursor in the same URL update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    viewsState.data = [];
    setUrl("");
  });

  it("a filter bar status toggle drops cursor so the next page starts from the first result", () => {
    setUrl("cursor=c-900");
    const { result } = renderHook(() => useTicketFilterParams());

    act(() => {
      result.current.handleToggleStatus("OPEN");
    });

    expect(lastParams().get("cursor")).toBeNull();
    expect(lastParams().get("status")).toBe("OPEN");
  });

  it("a search clear drops cursor because the result set changes", () => {
    setUrl("cursor=c-900&q=bug");
    const { result } = renderHook(() => useTicketFilterParams());

    act(() => {
      result.current.handleSearchChange("");
    });

    expect(lastParams().get("cursor")).toBeNull();
  });

  it("a module filter change drops cursor because the ticket collection changes", () => {
    setUrl("cursor=c-900");
    const { result } = renderHook(() => useModuleFilterParam());

    act(() => {
      result.current.setModuleFilter("mod-42");
    });

    expect(lastParams().get("cursor")).toBeNull();
    expect(lastParams().get("module")).toBe("mod-42");
  });

  it("a QA severity filter drops cursor because a narrower result set shifts all positions", () => {
    setUrl("cursor=c-900&type=BUG");
    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleQaFilterChange("severity", "HIGH");
    });

    expect(lastParams().get("cursor")).toBeNull();
    expect(lastParams().get("severity")).toBe("HIGH");
  });

  it("a sort order change drops cursor so pagination restarts with the new order", () => {
    setUrl("cursor=c-900&orderBy=rank&orderDir=asc");
    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.setDisplayOptions({ ...DEFAULT_DISPLAY_OPTIONS, orderBy: "updated" });
    });

    expect(lastParams().get("cursor")).toBeNull();
    expect(lastParams().get("orderBy")).toBe("updated");
  });

  it("a saved view apply drops cursor because the view carries its own result set", () => {
    viewsState.data = [SAVED_VIEW];
    setUrl("cursor=c-900&viewId=42");
    renderHook(() => useBoardUrlState(1));

    expect(lastParams().get("cursor")).toBeNull();
    expect(lastParams().get("priority")).toBe("HIGH");
  });
});

describe("non-shape changes keep cursor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    viewsState.data = [];
    setUrl("");
  });

  it("a view-type switch keeps cursor because view type does not change what data is fetched", () => {
    setUrl("cursor=c-900&view=board");
    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.handleViewChange("list");
    });

    expect(lastParams().get("cursor")).toBe("c-900");
    expect(lastParams().get("view")).toBe("list");
  });

  it("a display option change with the same orderBy keeps cursor because the sort order is unchanged", () => {
    setUrl("cursor=c-900&orderBy=updated&orderDir=desc");
    const { result } = renderHook(() => useBoardUrlState(1));

    act(() => {
      result.current.setDisplayOptions({
        ...DEFAULT_DISPLAY_OPTIONS,
        orderBy: "updated",
        groupBy: "assignee",
      });
    });

    expect(lastParams().get("cursor")).toBe("c-900");
    expect(lastParams().get("groupBy")).toBe("assignee");
  });
});
