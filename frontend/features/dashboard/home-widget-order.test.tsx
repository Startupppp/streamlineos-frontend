import * as React from "react";
import { act, renderHook, render, screen } from "@testing-library/react";
import type { PropsWithChildren, HTMLAttributes } from "react";
import {
  applyWidgetOrder,
  useHomeCustomisation,
  HOME_CUSTOMISATION_DEFAULT,
  getDefaultWidgetOrder,
} from "./use-home-customisation";
import { HomeWidgetGrid, type HomeWidgetGridProps } from "./home-widget-grid";
import type { DashboardAccess } from "./use-dashboard-access";

let currentScope = "test-scope";

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => currentScope,
  orgScopedStorageKey: (name: string, scope: string) => `${scope}::${name}`,
  UNSCOPED: "unscoped",
}));

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    const Lazy = React.lazy(loader);
    function DynamicWidget(props: Record<string, unknown>) {
      return (
        <React.Suspense fallback={null}>
          <Lazy {...props} />
        </React.Suspense>
      );
    }
    return DynamicWidget;
  },
}));

jest.mock("framer-motion", () => {
  function MotionDiv({
    children,
    variants: _v,
    ...props
  }: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variants?: unknown }>) {
    return <div {...props}>{children}</div>;
  }
  return { motion: { div: MotionDiv }, useReducedMotion: () => false };
});

jest.mock("next/link", () => ({
  __esModule: true,
  default: function MockLink({
    children,
    href,
    ...props
  }: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return <a href={href} {...props}>{children}</a>;
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", name: "Test" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("@/features/dashboard/use-dashboard-access", () => ({
  useDashboardAccess: () => ({
    accessLoading: false,
    accessResolved: true,
    refetchAccess: jest.fn(),
    hrEnabled: true,
    crmEnabled: true,
    projectsEnabled: true,
    payrollEnabled: true,
    canViewExecutive: true,
    canSelfAttendance: true,
    canViewCrmLeads: true,
    canViewPayrollSelf: true,
  }),
}));

jest.mock("@/hooks/api/dashboard", () => ({
  usePersonalDashboard: () => ({
    data: { myTasks: [], timesheetStatus: null, upcomingEvents: [], degraded: [] },
    isLoading: false,
  }),
  usePendingApprovals: () => ({ data: { total: 0 }, isLoading: false }),
  useAnnouncements: () => ({ data: [], isLoading: false }),
  useCreateAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useMyLeaveBalance: () => ({ data: [], isLoading: false }),
  useLeavesToday: () => ({ data: { data: [], total: 0 }, isLoading: false }),
  useUpcomingHolidays: () => ({ data: [], isLoading: false }),
  useCrmPulse: () => ({ data: null, isLoading: false, error: null, refetch: jest.fn() }),
  useTodayActivities: () => ({ data: [], isLoading: false, error: null, refetch: jest.fn() }),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrAttendanceStatus: () => ({ data: null, isLoading: false }),
  useHrMyLeaveRequests: () => ({ data: { requests: [] }, isLoading: false }),
  useExpensePageData: () => ({
    data: { expenses: [], stats: null, total: 0, isAdmin: false },
    isLoading: false,
  }),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useUnreadNotifications: () => ({ data: [], isLoading: false }),
  useMarkNotificationRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/payroll/ess", () => ({
  useEssOverview: () => ({ data: null, isLoading: false }),
}));
jest.mock("@/hooks/api/payroll/command-center", () => ({
  useCommandCenter: () => ({ data: null, isLoading: false }),
}));
jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInboxCount: () => ({
    data: { notification: 0, mail: 0, approval: 0, total: 0, mailExact: true },
    isLoading: false,
  }),
}));
jest.mock("@/features/hr/attendance/attendance-regularization-dialog", () => ({
  AttendanceRegularizationDialog: () => null,
}));
jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({
  CreateExpenseDialog: () => null,
}));

const allEnabled: HomeWidgetGridProps = {
  projectsEnabled: true,
  hrEnabled: true,
  canViewExecutive: true,
  canSelfAttendance: true,
  crmEnabled: true,
  canViewCrmLeads: true,
  payrollEnabled: true,
  canViewPayrollSelf: true,
  expensesEnabled: true,
  expensesSlot: undefined,
};

beforeEach(() => {
  window.localStorage.clear();
  currentScope = "test-scope";
});

describe("applyWidgetOrder — pure function", () => {
  it("returns allIds unchanged when widgetOrder is empty", () => {
    expect(applyWidgetOrder(["A", "B", "C"], [])).toEqual(["A", "B", "C"]);
  });

  it("reorders allIds to match widgetOrder", () => {
    expect(applyWidgetOrder(["A", "B", "C"], ["C", "A", "B"])).toEqual([
      "C", "A", "B",
    ]);
  });

  it("ignores stale IDs in widgetOrder that are not in allIds", () => {
    expect(applyWidgetOrder(["A", "B"], ["STALE", "B", "A"])).toEqual(["B", "A"]);
  });

  it("appends newly-added IDs (not in widgetOrder) at the end in their original order", () => {
    expect(applyWidgetOrder(["A", "B", "NEW1", "NEW2"], ["B", "A"])).toEqual([
      "B", "A", "NEW1", "NEW2",
    ]);
  });
});

describe("useHomeCustomisation — reorder", () => {
  it("moveWidget moves a widget one step up in the effective order", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Payroll", "up", ["Alerts", "Payroll"]);
    });
    expect(result.current.state.widgetOrder).toEqual(["Payroll", "Alerts"]);
  });

  it("moveWidget moves a widget one step down in the effective order", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Alerts", "down", ["Alerts", "Payroll"]);
    });
    expect(result.current.state.widgetOrder).toEqual(["Payroll", "Alerts"]);
  });

  it("moveWidget is a no-op when the widget is already at the boundary", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Alerts", "up", ["Alerts", "Payroll"]);
    });
    expect(result.current.state.widgetOrder).toEqual([]);
  });

  it("persists widgetOrder to org-scoped storage and reloads it on remount", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Payroll", "up", ["Alerts", "Payroll"]);
    });
    expect(result.current.state.widgetOrder).toEqual(["Payroll", "Alerts"]);
    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.widgetOrder).toEqual(["Payroll", "Alerts"]);
  });

  it("reset clears widgetOrder back to the default empty array", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Payroll", "up", ["Alerts", "Payroll"]);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.widgetOrder).toEqual([]);
  });

  it("corrupt stored state falls back to defaults without throwing", () => {
    window.localStorage.setItem("test-scope::home-widget-customisation", "NOT JSON{{{");
    const { result } = renderHook(() => useHomeCustomisation());
    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
  });

  it("order is org-scoped: different orgs get independent widgetOrders", () => {
    currentScope = "org-a";
    const { result: rA } = renderHook(() => useHomeCustomisation());
    act(() => {
      rA.current.moveWidget("Payroll", "up", ["Alerts", "Payroll"]);
    });
    expect(rA.current.state.widgetOrder).toEqual(["Payroll", "Alerts"]);

    currentScope = "org-b";
    const { result: rB } = renderHook(() => useHomeCustomisation());
    expect(rB.current.state.widgetOrder).toEqual([]);
  });
});

describe("HomeWidgetGrid — reorder changes actual render order", () => {
  it("POSITIVE: Payroll renders when not hidden and no custom order", async () => {
    render(<HomeWidgetGrid {...allEnabled} />);
    expect(await screen.findByText("My Payroll", {}, { timeout: 3_000 })).toBeInTheDocument();
  });

  it("NEGATIVE: stored widgetOrder placing Payroll before Alerts is actually applied to render order — this catches the previous bug of persisting order but ignoring it", async () => {
    window.localStorage.setItem(
      "test-scope::home-widget-customisation",
      JSON.stringify({
        hiddenWidgets: [],
        density: "comfortable",
        widgetOrder: [
          "Payroll", "My tasks", "Timesheet", "Leave balance",
          "Alerts", "Announcements", "Upcoming events",
          "Business pulse", "Today's activities", "My attendance",
        ],
      }),
    );
    render(<HomeWidgetGrid {...allEnabled} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    const html = document.body.innerHTML;
    const payrollPos = html.indexOf("My Payroll");
    const alertsPos = html.indexOf("Important Alerts");
    expect(payrollPos).toBeGreaterThan(-1);
    expect(alertsPos).toBeGreaterThan(-1);
    expect(payrollPos).toBeLessThan(alertsPos);
  });

  it("hidden widget is excluded from render even when it appears in widgetOrder (hidden takes precedence over order)", async () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.moveWidget("Payroll", "up", ["Alerts", "Payroll"]);
      result.current.toggleWidgetVisibility("Payroll");
    });
    render(<HomeWidgetGrid {...allEnabled} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("My Payroll")).not.toBeInTheDocument();
  });
});

function makeAccess(overrides: Partial<DashboardAccess> = {}): DashboardAccess {
  return {
    accessLoading: false, accessResolved: true, refetchAccess: jest.fn(),
    hrEnabled: false, crmEnabled: false, projectsEnabled: false,
    payrollEnabled: false, signEnabled: false,
    canViewEmployees: false, canCreateEmployees: false,
    canViewAttendance: false, canSelfAttendance: false,
    canViewLeaves: false, canApproveLeaves: false,
    canViewExecutive: false, canViewCrmLeads: false, canViewCrmReports: false,
    canViewTickets: false, canViewPayrollSelf: false, canViewSignEnvelopes: false,
    ...overrides,
  };
}

describe("getDefaultWidgetOrder — role-aware defaults", () => {
  it("executive: first three are Business pulse, Alerts, My tasks", () => {
    const order = getDefaultWidgetOrder(makeAccess({ canViewExecutive: true }));
    expect(order.slice(0, 3)).toEqual(["Business pulse", "Alerts", "My tasks"]);
  });

  it("org-admin: first three are Alerts, Announcements, My tasks", () => {
    const order = getDefaultWidgetOrder(
      makeAccess({ canViewEmployees: true, canViewExecutive: false }),
    );
    expect(order.slice(0, 3)).toEqual(["Alerts", "Announcements", "My tasks"]);
  });

  it("hr-admin: first three are Leave balance, My attendance, Alerts", () => {
    const order = getDefaultWidgetOrder(
      makeAccess({ hrEnabled: true, canViewAttendance: true, canViewExecutive: false }),
    );
    expect(order.slice(0, 3)).toEqual(["Leave balance", "My attendance", "Alerts"]);
  });

  it("crm-user: first three are Today's activities, Alerts, Announcements", () => {
    const order = getDefaultWidgetOrder(
      makeAccess({ crmEnabled: true, canViewCrmLeads: true, canViewExecutive: false }),
    );
    expect(order.slice(0, 3)).toEqual(["Today's activities", "Alerts", "Announcements"]);
  });

  it("build-user: first three are My tasks, Timesheet, Alerts", () => {
    const order = getDefaultWidgetOrder(
      makeAccess({ projectsEnabled: true, hrEnabled: false, crmEnabled: false, canViewExecutive: false }),
    );
    expect(order.slice(0, 3)).toEqual(["My tasks", "Timesheet", "Alerts"]);
  });

  it("manager: first three are My tasks, Alerts, Leave balance", () => {
    const order = getDefaultWidgetOrder(
      makeAccess({ projectsEnabled: true, hrEnabled: true, canViewLeaves: true, canViewExecutive: false }),
    );
    expect(order.slice(0, 3)).toEqual(["My tasks", "Alerts", "Leave balance"]);
  });

  it("member (default): first three are My tasks, Timesheet, Upcoming events", () => {
    const order = getDefaultWidgetOrder(makeAccess());
    expect(order.slice(0, 3)).toEqual(["My tasks", "Timesheet", "Upcoming events"]);
  });

  it("executive and member get different first widgets — personas are distinct", () => {
    const member = getDefaultWidgetOrder(makeAccess());
    const exec = getDefaultWidgetOrder(makeAccess({ canViewExecutive: true }));
    expect(member[0]).not.toBe(exec[0]);
  });
});

describe("applyWidgetOrder — new-widget append contract", () => {
  it("POSITIVE: applyWidgetOrder appends a newly-added widget ID at the end", () => {
    const result = applyWidgetOrder(["A", "B", "NEW"], ["B", "A"]);
    expect(result).toEqual(["B", "A", "NEW"]);
  });

  it("NEGATIVE: the new widget does NOT go missing — it must be in the result", () => {
    const result = applyWidgetOrder(["A", "B", "NEW"], ["B", "A"]);
    expect(result).toContain("NEW");
    expect(result.length).toBe(3);
  });
});
