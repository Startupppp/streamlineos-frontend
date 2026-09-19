import { render } from "@testing-library/react";
import { AllWorkPage } from "./all-work-page";

const CUSTOM_STATUSES = [
  { name: "CODE REVIEW", color: "#0f0", type: "started" },
  { name: "BLOCKED", color: "#f00", type: "started" },
];

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/build/all-work",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
}));
jest.mock("@/hooks/api/build", () => ({
  useInfiniteAllWork: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  }),
  useProjects: () => ({ data: undefined }),
}));
const mockUseOrgCustomStates = jest.fn(() => ({ data: CUSTOM_STATUSES as typeof CUSTOM_STATUSES | undefined }));
jest.mock("@/hooks/api/build/custom-states", () => ({
  useOrgCustomStates: (...args: unknown[]) => mockUseOrgCustomStates(...args),
}));

const mockTicketFilterBar = jest.fn(() => null);
jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: (props: Record<string, unknown>) => {
    mockTicketFilterBar(props);
    return null;
  },
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
  AllWorkSkeleton: () => null,
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
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));
jest.mock("@/components/ui/page-tabs-toolbar", () => ({
  PageTabsToolbar: ({ filters }: { filters?: React.ReactNode }) => <div>{filters}</div>,
}));
jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children?: React.ReactNode; filters?: React.ReactNode }) => (
    <div>{filters}{children}</div>
  ),
}));
jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

import React from "react";

beforeEach(() => {
  mockTicketFilterBar.mockClear();
});

describe("AllWorkPage — org-wide statuses passed to TicketFilterBar", () => {
  it("passes statuses from useOrgCustomStates to TicketFilterBar so custom workflows are reachable", () => {
    render(<AllWorkPage />);
    const calls = mockTicketFilterBar.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0] as Record<string, unknown>;
    expect(props).toBeDefined();
    expect(props.statuses).toEqual(CUSTOM_STATUSES);
  });

  it("passes undefined statuses (not the hardcoded four) when useOrgCustomStates has not loaded yet", () => {
    mockUseOrgCustomStates.mockReturnValueOnce({ data: undefined });
    render(<AllWorkPage />);
    const calls = mockTicketFilterBar.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const props = calls[0]?.[0] as Record<string, unknown>;
    expect(props.statuses).toBeUndefined();
  });
});
