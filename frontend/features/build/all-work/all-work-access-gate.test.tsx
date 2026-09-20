import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const useCanState = jest.fn();
const useInfiniteAllWork = jest.fn();
const useProjects = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/all-work",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
}));
jest.mock("@/hooks/api/access", () => ({
  useCanState: (key: string) => useCanState(key),
}));
jest.mock("@/hooks/api/build", () => ({
  useInfiniteAllWork: () => useInfiniteAllWork(),
  useProjects: () => useProjects(),
}));
jest.mock("@/hooks/api/build/custom-states", () => ({
  useOrgCustomStates: () => ({ data: undefined }),
}));
jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: () => null,
}));
jest.mock("./use-all-work-filters", () => ({
  useAllWorkFilters: () => ({
    view: "list" as const,
    scopeMine: false,
    filters: {},
    hasActiveFilters: false,
    handleViewChange: jest.fn(),
    handleScopeToggle: jest.fn(),
    handleClearFilters: jest.fn(),
  }),
}));
jest.mock("./use-all-work-bulk", () => ({
  useAllWorkBulk: () => ({
    tableSelection: new Set<number>(),
    setTableSelection: jest.fn(),
    handleBulkStatus: jest.fn(),
    handleBulkPriority: jest.fn(),
    handleBulkAssignee: jest.fn(),
    handleBulkSprintNoOp: jest.fn(),
    handleClearSelection: jest.fn(),
  }),
}));
jest.mock("./all-work-view-switcher", () => ({
  AllWorkViewSwitcher: () => null,
  AllWorkSkeleton: () => <div data-testid="all-work-skeleton" />,
}));
jest.mock("./all-work-views-menu", () => ({
  AllWorkViewsMenu: () => null,
}));
jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: () => null,
}));
jest.mock("@animateicons/react/lucide", () => ({
  UserIcon: () => null,
}));
jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));
jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ filters }: { filters?: ReactNode }) => <div>{filters}</div>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children?: ReactNode; filters?: ReactNode }) => (
    <div>{filters}{children}</div>
  ),
}));
jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/lib/motion-presets", () => ({
  pmSnappy: {},
  viewSwap: { initial: {}, animate: {}, exit: {} },
  viewSwapReduced: { initial: {}, animate: {}, exit: {} },
}));
jest.mock("./all-work-ticket-utils", () => ({
  groupByProject: () => [],
}));
jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/tickets/1",
}));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));

import { AllWorkPage } from "./all-work-page";

function pendingInfiniteQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useCanState.mockReturnValue("granted");
  useInfiniteAllWork.mockReturnValue(pendingInfiniteQuery());
  useProjects.mockReturnValue({ data: undefined });
});

describe("AllWorkPage — access is three-valued, not a boolean", () => {
  it("renders NoPermissionState once build:tickets:view has actually said no, instead of falling through to the empty ticket state", () => {
    useCanState.mockReturnValue("denied");

    render(<AllWorkPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/no tickets yet/i)).toBeNull();
  });

  it("shows the loading state while the access snapshot is still in flight, never an access denial", () => {
    useCanState.mockReturnValue("loading");

    render(<AllWorkPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });
});
