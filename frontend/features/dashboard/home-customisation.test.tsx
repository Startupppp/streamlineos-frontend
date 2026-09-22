import * as React from "react";
import { act, render, screen, renderHook } from "@testing-library/react";
import type { PropsWithChildren, HTMLAttributes } from "react";
import { HomeWidgetGrid, type HomeWidgetGridProps } from "./home-widget-grid";
import {
  useHomeCustomisation,
  HOME_CUSTOMISATION_DEFAULT,
} from "./use-home-customisation";

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
    children, variants: _v, ...props
  }: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variants?: unknown }>) {
    return <div {...props}>{children}</div>;
  }
  return { motion: { div: MotionDiv }, useReducedMotion: () => false };
});

jest.mock("next/link", () => {
  return function MockLink({
    children, href, ...props
  }: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock("@/lib/org-scoped-storage", () => ({
  useOrgStorageScope: () => "test-scope",
  orgScopedStorageKey: (name: string, scope: string) => `${scope}::${name}`,
  UNSCOPED: "unscoped",
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useCanState: () => "granted",
  useAccess: () => ({ data: { isOrgOwner: true, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/dashboard", () => ({
  usePersonalDashboard: () => ({ data: { myTasks: [], timesheetStatus: null, upcomingEvents: [], degraded: [] }, isLoading: false }),
  usePendingApprovals: () => ({ data: { pendingLeaves: 0, pendingResignations: 0, total: 0 }, isLoading: false }),
  useAnnouncements: () => ({ data: [], isLoading: false }),
  useCreateAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useMyLeaveBalance: () => ({ data: [], isLoading: false }),
  useLeavesToday: () => ({ data: { data: [], total: 0, hasMore: false }, isLoading: false }),
  useUpcomingHolidays: () => ({ data: [], isLoading: false }),
  useCrmPulse: () => ({ data: null, isLoading: false, error: null, refetch: jest.fn() }),
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
    signEnabled: true,
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
    canViewSignEnvelopes: true,
  }),
}));

jest.mock("@/hooks/api/hr", () => ({
  useHrAttendanceStatus: () => ({ data: null, isLoading: false }),
  useHrMyLeaveRequests: () => ({ data: { requests: [] }, isLoading: false }),
  useExpensePageData: () => ({ data: { expenses: [], stats: null, total: 0, isAdmin: false }, isLoading: false }),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useUnreadNotifications: () => ({ data: [], isLoading: false }),
  useMarkNotificationRead: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/api/payroll/ess", () => ({ useEssOverview: () => ({ data: null, isLoading: false }) }));
jest.mock("@/hooks/api/payroll/command-center", () => ({ useCommandCenter: () => ({ data: null, isLoading: false }) }));
jest.mock("@/hooks/api/inbox", () => ({ useUnifiedInboxCount: () => ({ data: { notification: 0, mail: 0, approval: 0, total: 0, mailExact: true }, isLoading: false }) }));

jest.mock("@/features/hr/attendance/attendance-regularization-dialog", () => ({
  AttendanceRegularizationDialog: () => null,
}));
jest.mock("@/features/hr/expenses/components/create-expense-dialog", () => ({
  CreateExpenseDialog: () => null,
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));
jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "u1", name: "Test" }, orgId: "org_1" }, status: "authenticated" }),
}));

const allEnabled: HomeWidgetGridProps = {
  projectsEnabled: true, hrEnabled: true,
  canViewExecutive: true, canSelfAttendance: true,
  crmEnabled: true, canViewCrmLeads: true,
  expensesSlot: <div>My Expenses</div>,
};

beforeEach(() => { window.localStorage.clear(); });

describe("useHomeCustomisation — persistence", () => {
  it("starts with the default state", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
  });

  it("persists density in org-scoped storage (fresh hook reads back the stored value)", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.setDensity("compact"); });
    expect(result.current.state.density).toBe("compact");
    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.density).toBe("compact");
  });

  it("persists hidden widgets in org-scoped storage (fresh hook reads back the stored value)", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.toggleWidgetVisibility("Alerts"); });
    expect(result.current.state.hiddenWidgets).toContain("Alerts");
    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.hiddenWidgets).toContain("Alerts");
  });

  it("toggleWidgetVisibility hides and then unhides a widget", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.toggleWidgetVisibility("Payroll"); });
    expect(result.current.isHidden("Payroll")).toBe(true);
    act(() => { result.current.toggleWidgetVisibility("Payroll"); });
    expect(result.current.isHidden("Payroll")).toBe(false);
  });

  it("reset restores the default state and clears stored state", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => {
      result.current.setDensity("compact");
      result.current.toggleWidgetVisibility("Alerts");
    });
    act(() => { result.current.reset(); });
    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.density).toBe("comfortable");
  });
});

describe("HomeWidgetGrid — hidden widgets do not render", () => {
  it("POSITIVE: Payroll widget renders when not hidden", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(await screen.findByText("My Payroll", {}, { timeout: 3_000 })).toBeInTheDocument();
  });

  it("NEGATIVE: Payroll widget is absent when hidden via customisation", async () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.toggleWidgetVisibility("Payroll"); });
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("My Payroll")).not.toBeInTheDocument();
  });

  it("POSITIVE: Alerts widget renders when not hidden", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.getByText("Important Alerts")).toBeInTheDocument();
  });

  it("NEGATIVE: Alerts widget is absent when hidden", async () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.toggleWidgetVisibility("Alerts"); });
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("Important Alerts")).not.toBeInTheDocument();
  });

  it("a widget the actor lacks access to stays absent even after toggle (customisation narrows)", async () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.toggleWidgetVisibility("My tasks"); });
    act(() => { result.current.toggleWidgetVisibility("My tasks"); });
    render(<HomeWidgetGrid {...allEnabled} projectsEnabled={false} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
  });
});

describe("HomeWidgetGrid — density class (positive and negative)", () => {
  it("NEGATIVE: comfortable density uses gap-4 (not gap-2)", () => {
    const { container } = render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(container.querySelector(".grid.gap-4")).not.toBeNull();
    expect(container.querySelector(".grid.gap-2")).toBeNull();
  });

  it("POSITIVE: compact density uses gap-2", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    act(() => { result.current.setDensity("compact"); });
    const { container } = render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(container.querySelector(".gap-2")).not.toBeNull();
  });
});

describe("HomeWidgetGrid — role-shaped sections", () => {
  it("renders My day section header for all users", () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(screen.getByText(/my day/i)).toBeInTheDocument();
  });

  it("POSITIVE: My tasks renders for a member with projectsEnabled", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.getByText("My Tasks")).toBeInTheDocument();
  });

  it("NEGATIVE: My tasks does NOT render when projectsEnabled is false", async () => {
    render(<HomeWidgetGrid {...allEnabled} projectsEnabled={false} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
  });

  it("POSITIVE: Business pulse renders for org admin with canViewExecutive", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.getByText("Business Pulse")).toBeInTheDocument();
  });

  it("NEGATIVE: Business pulse does NOT render for member without canViewExecutive", async () => {
    render(<HomeWidgetGrid {...allEnabled} canViewExecutive={false} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("Business Pulse")).not.toBeInTheDocument();
  });

  it("NEGATIVE: Today's activities does NOT render when crmEnabled is false", async () => {
    render(<HomeWidgetGrid {...allEnabled} crmEnabled={false} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);
    expect(screen.queryByText("Today's Activities")).not.toBeInTheDocument();
  });

  it("renders the Customise button for all users", () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(screen.getByRole("button", { name: /customise home layout/i })).toBeInTheDocument();
  });
});
