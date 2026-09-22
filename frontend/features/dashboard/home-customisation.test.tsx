import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren, HTMLAttributes } from "react";
import type { ReactNode } from "react";
import { HomeWidgetGrid, type HomeWidgetGridProps } from "./home-widget-grid";
import {
  useHomeCustomisation,
  HOME_CUSTOMISATION_DEFAULT,
  type HomeCustomisationState,
} from "./use-home-customisation";

jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    loader: () => Promise<{ default: React.ComponentType<unknown> }>,
  ) => {
    const Lazy = require("react").lazy(loader);
    function DynamicUnderTest(props: Record<string, unknown>) {
      return (
        <require("react").Suspense fallback={null}>
          <Lazy {...props} />
        </require("react").Suspense>
      );
    }
    return DynamicUnderTest;
  },
}));

jest.mock("framer-motion", () => {
  function MotionDiv({
    children,
    variants: _variants,
    ...props
  }: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { variants?: unknown }>) {
    return <div {...props}>{children}</div>;
  }
  return { motion: { div: MotionDiv }, useReducedMotion: () => false };
});

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
    ...props
  }: PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
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
  usePersonalDashboard: () => ({
    data: { myTasks: [], timesheetStatus: null, upcomingEvents: [], degraded: [] },
    isLoading: false,
  }),
  usePendingApprovals: () => ({
    data: { pendingLeaves: 0, pendingResignations: 0, total: 0 },
    isLoading: false,
  }),
  useAnnouncements: () => ({ data: [], isLoading: false }),
  useCreateAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useDeleteAnnouncement: () => ({ mutate: jest.fn(), isPending: false }),
  useMyLeaveBalance: () => ({ data: [], isLoading: false }),
  useLeavesToday: () => ({ data: { data: [], total: 0, hasMore: false }, isLoading: false }),
  useUpcomingHolidays: () => ({ data: [], isLoading: false }),
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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "u1", name: "Test User" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

const allEnabled: HomeWidgetGridProps = {
  projectsEnabled: true,
  hrEnabled: true,
  canViewExecutive: true,
  canSelfAttendance: true,
  crmEnabled: true,
  canViewCrmLeads: true,
  expensesSlot: <div>My Expenses</div>,
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("useHomeCustomisation — persistence", () => {
  it("starts with the default state when nothing is stored", () => {
    const { result } = renderHook(() => useHomeCustomisation());
    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
  });

  it("persists density choice in org-scoped storage", () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.setDensity("compact");
    });

    expect(result.current.state.density).toBe("compact");
    const stored = JSON.parse(
      window.localStorage.getItem("test-scope::home-widget-customisation") ?? "{}",
    ) as HomeCustomisationState;
    expect(stored.density).toBe("compact");
  });

  it("persists hidden widgets in org-scoped storage", () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("Alerts");
    });

    expect(result.current.state.hiddenWidgets).toContain("Alerts");
    const stored = JSON.parse(
      window.localStorage.getItem("test-scope::home-widget-customisation") ?? "{}",
    ) as HomeCustomisationState;
    expect(stored.hiddenWidgets).toContain("Alerts");
  });

  it("toggleWidgetVisibility hides a visible widget", () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("Payroll");
    });

    expect(result.current.isHidden("Payroll")).toBe(true);
  });

  it("toggleWidgetVisibility unhides an already-hidden widget", () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("Payroll");
    });
    act(() => {
      result.current.toggleWidgetVisibility("Payroll");
    });

    expect(result.current.isHidden("Payroll")).toBe(false);
  });

  it("reset restores the default state exactly", () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.setDensity("compact");
      result.current.toggleWidgetVisibility("Alerts");
      result.current.toggleWidgetVisibility("Announcements");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual(HOME_CUSTOMISATION_DEFAULT);
  });

  it("reset clears stored state so a fresh hook also sees the default", () => {
    const { result: r1 } = renderHook(() => useHomeCustomisation());

    act(() => {
      r1.current.setDensity("compact");
    });

    act(() => {
      r1.current.reset();
    });

    const { result: r2 } = renderHook(() => useHomeCustomisation());
    expect(r2.current.state.density).toBe("comfortable");
  });
});

describe("HomeWidgetGrid — a hidden widget does not render", () => {
  it("Payroll widget is absent from the DOM when hidden via customisation", async () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("Payroll");
    });

    render(
      <HomeWidgetGrid
        {...allEnabled}
        expensesSlot={undefined}
      />,
    );

    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("My Payroll")).not.toBeInTheDocument();
  });

  it("Alerts widget is absent from the DOM when hidden", async () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("Alerts");
    });

    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("Important Alerts")).not.toBeInTheDocument();
  });

  it("a widget the actor cannot access does not become visible by hiding and unhiding it", async () => {
    const noProjectAccess: HomeWidgetGridProps = {
      ...allEnabled,
      projectsEnabled: false,
      expensesSlot: undefined,
    };

    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.toggleWidgetVisibility("My tasks");
    });
    act(() => {
      result.current.toggleWidgetVisibility("My tasks");
    });

    render(<HomeWidgetGrid {...noProjectAccess} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
  });
});

describe("HomeWidgetGrid — density class", () => {
  it("applies compact gap when density is compact", async () => {
    const { result } = renderHook(() => useHomeCustomisation());

    act(() => {
      result.current.setDensity("compact");
    });

    const { container } = render(
      <HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />,
    );

    const grid = container.querySelector(".gap-2");
    expect(grid).not.toBeNull();
  });

  it("uses comfortable gap by default", async () => {
    const { container } = render(
      <HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />,
    );

    const grid = container.querySelector(".gap-4");
    expect(grid).not.toBeNull();
  });
});

describe("HomeWidgetGrid — role-shaped sections", () => {
  it("renders My tasks and Timesheet when projectsEnabled is true (member with build access)", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.getByText("My Tasks")).toBeInTheDocument();
    expect(screen.getByText("Timesheet")).toBeInTheDocument();
  });

  it("does NOT render My tasks or Timesheet when projectsEnabled is false (member without build access)", async () => {
    render(
      <HomeWidgetGrid {...allEnabled} projectsEnabled={false} expensesSlot={undefined} />,
    );
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("My Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("Timesheet")).not.toBeInTheDocument();
  });

  it("does NOT render Business pulse when canViewExecutive is false (org member)", async () => {
    render(
      <HomeWidgetGrid {...allEnabled} canViewExecutive={false} expensesSlot={undefined} />,
    );
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("Business Pulse")).not.toBeInTheDocument();
  });

  it("renders Business pulse when canViewExecutive is true (org admin/owner)", async () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.getByText("Business Pulse")).toBeInTheDocument();
  });

  it("does NOT render My attendance when canSelfAttendance is false", async () => {
    render(
      <HomeWidgetGrid {...allEnabled} canSelfAttendance={false} expensesSlot={undefined} />,
    );
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("My Attendance")).not.toBeInTheDocument();
  });

  it("does NOT render Today's activities when crmEnabled is false (disabled module)", async () => {
    render(
      <HomeWidgetGrid {...allEnabled} crmEnabled={false} expensesSlot={undefined} />,
    );
    await screen.findAllByText(/./, {}, { timeout: 3_000 }).catch(() => []);

    expect(screen.queryByText("Today's Activities")).not.toBeInTheDocument();
  });

  it("renders the My day section header for all users", () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(screen.getByText(/my day/i)).toBeInTheDocument();
  });
});

describe("HomeWidgetGrid — customisation bar renders", () => {
  it("shows the Customise button", () => {
    render(<HomeWidgetGrid {...allEnabled} expensesSlot={undefined} />);
    expect(
      screen.getByRole("button", { name: /customise home layout/i }),
    ).toBeInTheDocument();
  });
});
