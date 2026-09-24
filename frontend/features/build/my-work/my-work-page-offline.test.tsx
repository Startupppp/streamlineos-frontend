import type { ReactNode } from "react";
import {
  mockReplace,
  mockPush,
  mockUseAccess,
  mockUseAllWork,
  mockSearchParamsContainer,
  mockDefaultDisplayOptions,
  MockMyWorkContentStub,
  mockPageWrapperStub,
  mockPageTabsToolbarStub,
  mockPageStateStub,
  accessGranted,
  defaultAllWork,
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

import { render, screen } from "@testing-library/react";
import { MyWorkPage } from "./my-work-page";

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(accessGranted);
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseAllWork.mockReturnValue(defaultAllWork());
});

describe("MyWorkPage — offline suppresses misleading empty copy", () => {
  it("shows the offline message instead of the tab-specific empty label when offline and data is absent", () => {
    const { useOnlineStatus } = jest.requireMock<{
      useOnlineStatus: jest.Mock;
    }>("@/hooks/common/use-online-status");
    useOnlineStatus.mockReturnValue(false);

    mockUseAllWork.mockReturnValue({
      data: { data: [], hasMore: false, nextCursor: null, limit: 50 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    render(<MyWorkPage />);
    expect(screen.queryByText(/Nothing assigned to you/i)).toBeNull();

    useOnlineStatus.mockReturnValue(true);
  });
});

describe("MyWorkPage — sort control renders for the assigned tab", () => {
  it("renders the sort control when the view switcher is shown (assigned tab)", () => {
    render(<MyWorkPage />);
    expect(screen.getByTestId("sort-control")).toBeInTheDocument();
  });

  it("does not render the sort control for non-assigned tabs", () => {
    mockSearchParamsContainer.current = new URLSearchParams("tab=created");
    render(<MyWorkPage />);
    expect(screen.queryByTestId("sort-control")).toBeNull();
    expect(screen.queryByTestId("view-switcher")).toBeNull();
  });
});
