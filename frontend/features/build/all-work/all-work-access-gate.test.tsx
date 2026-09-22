import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { TicketGroup } from "./all-work-ticket-utils";
import type { AllWorkTicket } from "@/types/projects";
import type { BuildListGrouping } from "./use-all-work-filters";

const useAccess = jest.fn();
const accessLoading = { data: undefined, isLoading: true };
const accessGranted = {
  data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
  isLoading: false,
};
const accessDenied = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const useAllWork = jest.fn();
const useProjects = jest.fn();
const groupTicketsMock = jest.fn<TicketGroup[], [AllWorkTicket[], BuildListGrouping]>(() => []);

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
  useAccess: () => useAccess(),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build", () => ({
  useAllWork: () => useAllWork(),
  useProjects: () => useProjects(),
}));
jest.mock("@/hooks/api/build/custom-states", () => ({
  useOrgCustomStates: () => ({ data: undefined }),
}));
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
}));
jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: () => null,
}));
jest.mock("./use-all-work-filters", () => ({
  useAllWorkFilters: () => ({
    view: "list" as const,
    scopeMine: false,
    filters: {},
    grouping: "project" as BuildListGrouping,
    sortField: "rank",
    sortDirection: "desc",
    cursor: null,
    hasActiveFilters: false,
    isPending: false,
    handleViewChange: jest.fn(),
    handleScopeToggle: jest.fn(),
    handleClearFilters: jest.fn(),
    setListParams: jest.fn(),
    setCursor: jest.fn(),
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
jest.mock("./use-all-work-keyboard", () => ({
  useAllWorkKeyboard: jest.fn(),
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
  groupTickets: (tickets: AllWorkTicket[], grouping: BuildListGrouping) =>
    groupTicketsMock(tickets, grouping),
}));
jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/tickets/1",
}));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));
jest.mock("@/features/build/views/list-view", () => ({
  ListView: () => null,
}));
jest.mock("@/features/build/views/kanban-board", () => ({
  KanbanBoard: () => null,
}));
jest.mock("./project-chip", () => ({
  ProjectChip: () => null,
}));
jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

import { AllWorkPage } from "./all-work-page";

function pendingQuery() {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  };
}

const stubTicket: AllWorkTicket = {
  id: 1, title: "Stub ticket", type: "TASK", status: "TODO", priority: null,
  projectId: 1, projectKey: "ENG", projectName: "Engineering", ticketNumber: 1,
  sprintId: null, epicId: null, assigneeId: null, points: null, estimate: null,
  rank: null, startDate: null, dueDate: null, cycleId: null,
  createdAt: null, updatedAt: null, assignee: null, labels: [],
};

const stubGroup: TicketGroup = {
  id: 1,
  label: "Engineering",
  projectId: 1,
  projectKey: "ENG",
  tickets: [stubTicket],
};

beforeEach(() => {
  jest.clearAllMocks();
  useAccess.mockReturnValue(accessGranted);
  useAllWork.mockReturnValue(pendingQuery());
  useProjects.mockReturnValue({ data: undefined });
  groupTicketsMock.mockReturnValue([]);
});

describe("AllWorkPage — access is three-valued, not a boolean", () => {
  it("renders NoPermissionState once build:tickets:view has actually said no, instead of falling through to the empty ticket state", () => {
    useAccess.mockReturnValue(accessDenied);

    render(<AllWorkPage />);

    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByText(/no tickets yet/i)).toBeNull();
  });

  it("shows the loading state while the access snapshot is still in flight, never an access denial", () => {
    useAccess.mockReturnValue(accessLoading);

    render(<AllWorkPage />);

    expect(screen.queryByText(/access restricted/i)).toBeNull();
  });
});

describe("AllWorkPage — per-project badge count is honest about how many tickets are loaded when more pages exist", () => {
  it("list section badge shows a plain count with no suffix when all pages are loaded so users know they see the full set", () => {
    useAllWork.mockReturnValue({
      ...pendingQuery(),
      data: { data: [stubTicket], hasMore: false, nextCursor: null, limit: 50 },
    });
    groupTicketsMock.mockReturnValue([stubGroup]);

    render(<AllWorkPage />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("1+")).toBeNull();
  });

  it("list section badge appends + when more pages exist so the loaded-prefix count is not mistaken for the project total", () => {
    useAllWork.mockReturnValue({
      ...pendingQuery(),
      data: { data: [stubTicket], hasMore: true, nextCursor: "cur1", limit: 50 },
    });
    groupTicketsMock.mockReturnValue([stubGroup]);

    render(<AllWorkPage />);

    expect(screen.getByText("1+")).toBeInTheDocument();
  });
});
