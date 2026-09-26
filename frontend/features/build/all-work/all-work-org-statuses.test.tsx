import { render } from "@testing-library/react";
import { AllWorkPage } from "./all-work-page";
import type { BuildListGrouping } from "./use-all-work-filters";

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
jest.mock("@/hooks/api/access", () => ({
  useAccess: () => ({
    data: { isOrgOwner: false, scopes: { "build:tickets:view": "all" }, modules: {} },
    isLoading: false,
  }),
}));
jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build", () => ({
  useAllWork: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  useProjects: () => ({ data: undefined }),
}));
jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: () => true,
}));

type OrgStates = typeof CUSTOM_STATUSES | undefined;
const mockUseOrgCustomStates = jest.fn<{ data: OrgStates }, []>(() => ({ data: CUSTOM_STATUSES }));
jest.mock("@/hooks/api/build/custom-states", () => ({
  useOrgCustomStates: () => mockUseOrgCustomStates(),
}));
jest.mock("@/hooks/api/build/teams", () => ({
  useProjectTeams: () => ({ data: undefined }),
}));
jest.mock("@/hooks/api/build/managed-products", () => ({
  useManagedProducts: () => ({ data: undefined }),
}));
jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: () => null,
}));

interface FilterBarProps {
  statuses?: OrgStates;
}

const mockTicketFilterBar = jest.fn<null, [FilterBarProps]>(() => null);
jest.mock("@/features/build/shared/ticket-filter-bar", () => ({
  TicketFilterBar: (props: FilterBarProps) => {
    mockTicketFilterBar(props);
    return null;
  },
}));
jest.mock("./use-all-work-filters", () => ({
  useAllWorkFilters: () => ({
    view: "list" as const,
    scopeMine: false,
    filters: {},
    productIdFilter: null,
    teamIdFilter: null,
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
    handleBulkCycleNoOp: jest.fn(),
    handleClearSelection: jest.fn(),
  }),
}));
jest.mock("./use-all-work-keyboard", () => ({
  useAllWorkKeyboard: jest.fn(),
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
  groupTickets: () => [],
}));
jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: () => "/build/1/tickets/1",
}));
jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => String(e),
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
    expect(calls[0]?.[0]).toBeDefined();
    expect(calls[0]?.[0]?.statuses).toEqual(CUSTOM_STATUSES);
  });

  it("passes undefined statuses (not the hardcoded four) when useOrgCustomStates has not loaded yet", () => {
    mockUseOrgCustomStates.mockReturnValueOnce({ data: undefined });
    render(<AllWorkPage />);
    const calls = mockTicketFilterBar.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]?.[0]?.statuses).toBeUndefined();
  });
});
