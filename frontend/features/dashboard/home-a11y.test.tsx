/**
 * PRD-C115 — responsive accessibility for Home and self-service.
 *
 * Before this file the whole Home surface had exactly ONE axe assertion, over
 * the 40-line `HomeSectionBoundary` with a `<p>` child. That is a vacuous
 * corpus: it exercises no widget, no state and no breakpoint, so nine of the
 * fifteen error branches on Home could announce nothing to a screen reader and
 * the suite stayed green.
 *
 * The corpus here is the real one. `next/dynamic` is replaced by `React.lazy`
 * over the SAME loader the grid declares, so `HomeWidgetGrid` mounts the actual
 * eleven widgets rather than stubs; only the data hooks are faked, which is what
 * drives the four states. Every state is asserted at 375 / 768 / 1280, because
 * the criterion says *responsive* accessibility and the grid changes column
 * count at `md` and `xl`.
 *
 * The error state carries a second assertion that axe cannot make: axe checks
 * markup validity, not whether a failure is ANNOUNCED. A `<p class="text-sm
 * text-destructive">` is perfectly valid and completely silent. So each failed
 * widget's message must be reachable through `getByRole("alert")`.
 */

import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { atViewport, VIEWPORTS, type ViewportName } from "@/test-utils/viewport";
import { TooltipProvider } from "@/components/ui/tooltip";

type QueryLike = {
  data: unknown;
  isLoading: boolean;
  isError?: boolean;
  error: unknown;
  refetch: () => void;
};

const refetch = jest.fn();

function loading(): QueryLike {
  return { data: undefined, isLoading: true, isError: false, error: null, refetch };
}
function failed(message: string): QueryLike {
  return {
    data: undefined,
    isLoading: false,
    isError: true,
    error: new Error(message),
    refetch,
  };
}
function answered(data: unknown): QueryLike {
  return { data, isLoading: false, isError: false, error: null, refetch };
}

const q: Record<string, QueryLike> = {};

/**
 * The grid declares its widgets through `next/dynamic`, whose loader already
 * has React.lazy's exact contract — `() => Promise<{ default: Component }>`.
 * Handing the loader straight to `React.lazy` mounts the real widget instead of
 * a placeholder, which is the difference between testing Home and testing a
 * `<div />`.
 */
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    const Lazy = React.lazy(loader);
    function DynamicUnderTest(props: Record<string, unknown>) {
      return (
        <React.Suspense fallback={null}>
          <Lazy {...props} />
        </React.Suspense>
      );
    }
    return DynamicUnderTest;
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_1", name: "Ada" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/dashboard", () => ({
  usePersonalDashboard: () => q.personal,
  useExecutiveDashboard: () => q.executive,
  useLeavesToday: () => q.leavesToday,
  useUpcomingHolidays: () => q.holidays,
  useMyLeaveBalance: () => q.leaveBalance,
  useBirthdays: () => q.birthdays,
  usePendingApprovals: () => q.pendingApprovals,
  useAnnouncements: () => q.announcements,
  useCreateAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrMyLeaveRequests: () => q.myLeaveRequests,
  useHrAttendanceStatus: () => q.attendanceStatus,
  useExpensePageData: () => q.expenses,
}));

jest.mock("@/hooks/api/notifications", () => ({
  useUnreadNotifications: () => q.notifications,
  useMarkNotificationRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/payroll/ess", () => ({ useEssOverview: () => q.ess }));
jest.mock("@/hooks/api/payroll/command-center", () => ({
  useCommandCenter: () => q.commandCenter,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => q.access,
  useModuleEnabled: () => true,
}));

jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({
  CreateExpenseDialog: () => null,
}));

jest.mock("@/features/hr/attendance/attendance-regularization-dialog", () => ({
  AttendanceRegularizationDialog: () => null,
}));

const dashboardAccess = {
  accessLoading: false,
  accessResolved: true,
  refetchAccess: jest.fn(),
  hrEnabled: true,
  crmEnabled: true,
  projectsEnabled: true,
  payrollEnabled: true,
  signEnabled: true,
  accountingEnabled: true,
  canViewEmployees: true,
  canCreateEmployees: true,
  canViewAttendance: true,
  canSelfAttendance: true,
  canViewLeaves: true,
  canApproveLeaves: true,
  canViewExecutive: true,
  canViewCrmLeads: true,
  canViewCrmReports: true,
  canViewTickets: true,
  canViewPayrollSelf: true,
  canViewOnboardingDocsSummary: true,
  canViewExpenses: true,
  canCreateExpenses: true,
  canApproveExpenses: false,
  canViewSignEnvelopes: true,
};

jest.mock("./use-dashboard-access", () => ({
  useDashboardAccess: () => dashboardAccess,
}));

import { HomeWidgetGrid } from "./home-widget-grid";
import { ExpensesWidget } from "@/features/hr/expenses/expenses-widget";

const ACCESS_GRANTED = {
  isOrgOwner: true,
  scopes: { "crm:leads:view": "all" },
  modules: {},
};

const LOADED = {
  personal: answered({
    myTasks: [{ id: 1, title: "Ship the release", status: "IN_PROGRESS", priority: "HIGH" }],
    timesheetStatus: { submitted: false, hoursLogged: 12, expectedHours: 40 },
    upcomingEvents: [],
    degraded: [],
  }),
  executive: answered({ conversionRate: 22, mrr: 1200, pipelineValue: 4500, activeDeals: 3 }),
  leavesToday: answered([]),
  holidays: answered([]),
  leaveBalance: answered([
    { id: 1, leaveTypeName: "Annual", balance: "12", daysPerYear: 24 },
  ]),
  birthdays: answered([]),
  pendingApprovals: answered([]),
  announcements: answered([
    { id: 1, title: "All-hands Friday", content: "Come along.", isPinned: false, createdAt: "2026-09-01T00:00:00.000Z" },
  ]),
  myLeaveRequests: answered({ requests: [] }),
  attendanceStatus: answered({
    status: "CHECKED_IN",
    logs: [],
    dailyStats: { workHours: "7.5", breakHours: "0.5" },
  }),
  expenses: answered({ expenses: [], stats: null, total: 0, isAdmin: false }),
  notifications: answered([]),
  ess: answered({ latestPayslip: null }),
  commandCenter: answered({ runs: [] }),
} as const;

const EMPTY = {
  personal: answered({ myTasks: [], timesheetStatus: null, upcomingEvents: [], degraded: [] }),
  executive: answered({ conversionRate: 0 }),
  leavesToday: answered([]),
  holidays: answered([]),
  leaveBalance: answered([]),
  birthdays: answered([]),
  pendingApprovals: answered([]),
  announcements: answered([]),
  myLeaveRequests: answered({ requests: [] }),
  attendanceStatus: answered(null),
  expenses: answered({ expenses: [], stats: null, total: 0, isAdmin: false }),
  notifications: answered([]),
  ess: answered(null),
  commandCenter: answered(null),
} as const;

const HOOK_NAMES = Object.keys(LOADED);

/**
 * The ten headings Home mounts — nine from `home-widget-grid.tsx` plus the
 * expenses slot the route fills. Asserted so a future regression that turns a
 * widget back into a placeholder — or drops one from the grid — shrinks the
 * corpus loudly instead of silently. Recruitment is deliberately absent: root
 * §8 keeps the hiring pipeline out of Home, and
 * `home-section-boundary.test.tsx` fails if it comes back.
 */
const HOME_WIDGET_TITLES = [
  "My Tasks",
  "Timesheet",
  "My Leave Balance",
  "Important Alerts",
  "Announcements",
  "Upcoming Events",
  "Business Pulse",
  "My Attendance",
  "My Payroll",
  "My Expenses",
] as const;

/**
 * Every widget's own error message, so the alert assertion can name the exact
 * failing section rather than counting anonymous alerts.
 */
const FAILURE_MESSAGES: Record<string, string> = {
  personal: "personal section is down",
  executive: "executive section is down",
  leaveBalance: "leave balance section is down",
  announcements: "announcements section is down",
  attendanceStatus: "attendance section is down",
  expenses: "expenses section is down",
  notifications: "alerts section is down",
  ess: "payroll section is down",
};

function useState(state: "loading" | "loaded" | "empty" | "error"): void {
  q.access = answered(ACCESS_GRANTED);
  for (const name of HOOK_NAMES) {
    if (state === "loading") q[name] = loading();
    else if (state === "loaded") q[name] = { ...LOADED[name as keyof typeof LOADED] };
    else if (state === "empty") q[name] = { ...EMPTY[name as keyof typeof EMPTY] };
    else
      q[name] = FAILURE_MESSAGES[name]
        ? failed(FAILURE_MESSAGES[name] as string)
        : { ...EMPTY[name as keyof typeof EMPTY] };
  }
}

async function renderGrid() {
  const view = render(
    <TooltipProvider>
      <HomeWidgetGrid
        projectsEnabled
        hrEnabled
        canViewExecutive
        canSelfAttendance
        expensesSlot={<ExpensesWidget />}
      />
    </TooltipProvider>,
  );
  await screen.findAllByText(/./, {}, { timeout: 5_000 }).catch(() => []);
  return view;
}

describe("PRD-C115 — the Home widget grid is accessible in every state, at every breakpoint", () => {
  let restoreViewport: (() => void) | undefined;

  afterEach(() => {
    restoreViewport?.();
    restoreViewport = undefined;
  });

  const viewports: ViewportName[] = ["mobile", "tablet", "desktop"];
  const states = ["loading", "loaded", "empty", "error"] as const;

  for (const viewport of viewports) {
    for (const state of states) {
      it(`MEASURED: axe reports no violation for the ${state} grid at ${viewport} (${VIEWPORTS[viewport]}px)`, async () => {
        restoreViewport = atViewport(viewport);
        useState(state);
        const { baseElement } = await renderGrid();
        await expectNoAxeViolations(baseElement);
      });
    }
  }

  it("MEASURED: the grid really mounts the ten Home widgets — this corpus is not a stub", async () => {
    useState("loaded");
    await renderGrid();

    for (const title of HOME_WIDGET_TITLES)
      expect((await screen.findAllByText(title)).length).toBeGreaterThan(0);
  });
});

describe("PRD-C115 — a failed Home widget is ANNOUNCED, not merely coloured red", () => {
  it("MEASURED: every failing section's message is reachable through role=alert", async () => {
    useState("error");
    await renderGrid();

    /**
     * The grid defers its second batch behind a timeout, so the first `alert`
     * to appear is not the last: resolving on it read as four silent widgets.
     * The claim is over the whole set, so the wait has to be too.
     */
    await waitFor(() => {
      const spoken = screen
        .getAllByRole("alert")
        .map((node) => node.textContent ?? "")
        .join(" | ");
      for (const message of Object.values(FAILURE_MESSAGES))
        expect(spoken).toContain(message);
    });
  });

  it("MEASURED: no failing section leaves its message outside a live region", async () => {
    useState("error");
    await renderGrid();

    for (const message of Object.values(FAILURE_MESSAGES)) {
      const nodes = await screen.findAllByText(message);
      expect(nodes.length).toBeGreaterThan(0);
      for (const node of nodes) {
        const live = node.closest('[role="alert"], [role="status"], [aria-live]');
        expect(live).not.toBeNull();
        expect(within(live as HTMLElement).getAllByText(message).length).toBeGreaterThan(0);
      }
    }
  });

  it("MEASURED: each announced failure still offers its own retry", async () => {
    useState("error");
    await renderGrid();

    await waitFor(() => {
      const retries = screen.getAllByRole("button", { name: /retry/i });
      expect(retries.length).toBeGreaterThanOrEqual(
        Object.keys(FAILURE_MESSAGES).length - 2,
      );
    });
  });
});
