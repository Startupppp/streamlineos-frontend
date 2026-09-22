import type { ReactNode } from "react";
import {
  mockReplace,
  mockPush,
  mockUseAccess,
  mockUseAllWork,
  mockSearchParamsContainer,
  mockDefaultDisplayOptions,
  mockMakeCursorPaginationStub,
  MockMyWorkContentStub,
  mockPageWrapperStub,
  mockPageTabsToolbarStub,
  mockPageStateStub,
  accessLoading,
  accessGranted,
  accessDenied,
  defaultAllWork,
  withData,
} from "./my-work-page-test-harness";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => "/build/my-work",
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: () => mockUseAccess(),
  useCan: (key: string) => {
    const d = mockUseAccess().data;
    return !!d && key in d.scopes;
  },
  useCanState: () => ({ state: "granted" }),
  usePermissionGate: () => ({ allowed: true }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/api/build/all-work", () => ({
  useAllWork: (...args: unknown[]) => mockUseAllWork(...args),
}));

jest.mock("@/hooks/api/build/custom-states", () => ({
  useOrgCustomStates: () => ({ data: [] }),
}));

jest.mock("@/hooks/common/use-after-load", () => ({
  useAfterLoad: () => false,
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/features/build/views/use-display-options", () => ({
  useDisplayOptions: () => [mockDefaultDisplayOptions, jest.fn()],
}));

jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: () => <div data-testid="filter-bar" />,
}));

jest.mock("@/features/build/views/view-switcher", () => ({
  ViewSwitcher: () => <div data-testid="view-switcher" />,
}));

jest.mock("@/features/build/views/display-options-panel", () => ({
  DisplayOptionsPanel: () => null,
}));

jest.mock("./grouping-sidebar", () => ({
  GroupingSidebar: () => null,
}));

jest.mock("./my-work-sort-control", () => ({
  MyWorkSortControl: () => <div data-testid="sort-control" />,
}));

jest.mock("./my-work-content", () => ({
  MyWorkContent: (props: Parameters<typeof MockMyWorkContentStub>[0]) =>
    MockMyWorkContentStub(props),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: (props: Parameters<typeof mockPageWrapperStub>[0]) =>
    mockPageWrapperStub(props),
}));

jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: (props: Parameters<typeof mockPageTabsToolbarStub>[0]) =>
    mockPageTabsToolbarStub(props),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: (props: Parameters<typeof mockPageStateStub>[0]) =>
    mockPageStateStub(props),
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { post: jest.fn(), get: jest.fn() },
  isApiError: jest.fn(() => false),
}));

jest.mock("@/lib/api-envelope", () => ({
  lazyContract: (fn: () => Promise<unknown>) => fn,
}));

jest.mock("@/lib/query-keys/build-work", () => ({
  buildWorkQueryKeys: {
    projects: { allWorkAll: ["build", "all-work"] },
  },
}));

jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));

jest.mock("@/hooks/api/build/build-tickets-subresource-schema", () => ({
  bulkUpdateResultContract: { parse: (v: unknown) => v },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: () => mockMakeCursorPaginationStub(),
}));

import { render, screen } from "@testing-library/react";
import { MyWorkPage } from "./my-work-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseAllWork.mockReturnValue(defaultAllWork());
});

describe("MyWorkPage — access is three-valued, not a boolean", () => {
  it("renders the denied surface when build:tickets:view is explicitly denied, not the empty state", () => {
    mockUseAccess.mockReturnValue(accessDenied);
    render(<MyWorkPage />);
    expect(screen.getByTestId("denied-view")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing assigned/i)).toBeNull();
  });

  it("does NOT show the denied surface while access is still loading", () => {
    mockUseAccess.mockReturnValue(accessLoading);
    render(<MyWorkPage />);
    expect(screen.queryByTestId("denied-view")).toBeNull();
  });

  it("renders the page wrapper when access is granted", () => {
    render(<MyWorkPage />);
    expect(screen.getByTestId("page-wrapper")).toBeInTheDocument();
  });
});

describe("MyWorkPage — URL param round-trips", () => {
  it("passes cycleId from URL to the assigned-tab all-work request so the cycle filter reaches the API", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cycleId=99");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string; cycleId?: string }]) => f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ cycleId: "99" });
  });

  it("normalises legacy `cycle` param to cycleId so old deep links continue to filter", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cycle=old-cycle-id");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string; cycleId?: string }]) => f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ cycleId: "old-cycle-id" });
  });

  it("forwards sprintId from URL to the all-work request", () => {
    mockSearchParamsContainer.current = new URLSearchParams("sprintId=7");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string; sprintId?: number }]) => f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ sprintId: 7 });
  });

  it("maps sort/dir URL params to orderBy/orderDir in the API request", () => {
    mockSearchParamsContainer.current = new URLSearchParams("sort=priority&dir=asc");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string }]) => f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ orderBy: "priority", orderDir: "asc" });
  });

  it("reads pmWorkspaceId from the URL and forwards it to the API request", () => {
    mockSearchParamsContainer.current = new URLSearchParams("pmWorkspaceId=ws-42");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string; pmWorkspaceId?: string }]) =>
        f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ pmWorkspaceId: "ws-42" });
  });

  it("cursor URL param is forwarded to the all-work request", () => {
    mockSearchParamsContainer.current = new URLSearchParams("cursor=abc123");
    render(<MyWorkPage />);
    const call = mockUseAllWork.mock.calls.find(
      ([f]: [{ scope?: string; cursor?: string }]) => f?.scope === "mine",
    );
    expect(call?.[0]).toMatchObject({ cursor: "abc123" });
  });
});

describe("MyWorkPage — state renders the correct surface", () => {
  it("shows a loading skeleton while data is fetching", () => {
    mockUseAllWork.mockReturnValue({ ...defaultAllWork(), isLoading: true });
    render(<MyWorkPage />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("shows the empty state with a clear-filters affordance when filters are active and results are empty", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=TODO");
    mockUseAllWork.mockReturnValue({
      data: { data: [], hasMore: false, nextCursor: null, limit: 50 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<MyWorkPage />);
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("shows ticket content when the request returns results", () => {
    mockUseAllWork.mockReturnValue(withData());
    render(<MyWorkPage />);
    expect(screen.getByTestId("content-ready")).toBeInTheDocument();
  });

  it("denial renders neither content-ready nor empty-state", () => {
    mockUseAccess.mockReturnValue(accessDenied);
    mockUseAllWork.mockReturnValue(withData());
    render(<MyWorkPage />);
    expect(screen.queryByTestId("content-ready")).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });
});

describe("MyWorkPage — pagination resets on filter change", () => {
  it("removes the cursor param from the request when a filter changes (shared hook resets cursor on shape change)", () => {
    mockSearchParamsContainer.current = new URLSearchParams("sort=priority&cursor=abc");
    render(<MyWorkPage />);
    const callWithCursor = mockUseAllWork.mock.calls.find(
      ([f]: [{ cursor?: string }]) => f?.cursor === "abc",
    );
    expect(callWithCursor).toBeTruthy();

    jest.clearAllMocks();
    mockSearchParamsContainer.current = new URLSearchParams("sort=rank");
    render(<MyWorkPage />);
    const callWithoutCursor = mockUseAllWork.mock.calls.find(
      ([f]: [{ cursor?: string }]) => f?.cursor === undefined,
    );
    expect(callWithoutCursor).toBeTruthy();
  });
});
