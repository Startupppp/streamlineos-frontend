import { Component, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { ApiError } from "@/lib/api-envelope";
import { queryKeys } from "@/lib/query-keys";
import { authenticatedScope } from "@/lib/query-scope";
import type { AccessResponse } from "@/types/access";
import { AnalyticsPageClient } from "@/features/hr/analytics/analytics-page-client";

const ORG_ID = "org-1";
const USER_ID = "user-1";

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { orgId: "org-1", user: { id: "user-1" } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
  isApiError: (error: unknown) =>
    error instanceof Error && error.name === "ApiError",
}));

import { apiClient } from "@/lib/api-client";

const mockedGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;

const ACCESS: AccessResponse = {
  scopes: { "hr:analytics:read": "all", "hr:interviews:view": "all" },
  isOrgOwner: false,
  canManageOrganizationMembership: false,
  modules: { hr: true },
};

class RouteErrorBoundaryProbe extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    process.stdout.write(`
CAUGHT[${String(error)}] endpoint=${(error as {endpoint?: string})?.endpoint ?? "?"}
`);
  }

  render() {
    if (this.state.failed) return <p>route error boundary</p>;
    return this.props.children;
  }
}

function client(): QueryClient {
  const queryClient = createAppQueryClient(authenticatedScope(ORG_ID, USER_ID));
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  queryClient.setQueryData(queryKeys.access.me(), ACCESS);
  return queryClient;
}

function renderUnderBoundary(ui: ReactNode) {
  return render(
    <QueryClientProvider client={client()}>
      <TooltipProvider>
        <RouteErrorBoundaryProbe>{ui}</RouteErrorBoundaryProbe>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

const OVERVIEW = {
  headcount: { total: 12, active: 11, newThisMonth: 1 },
  departments: [{ name: "Engineering", count: 8 }],
  gender: [{ gender: "MALE", count: 8 }],
  roles: [{ role: "MEMBER", count: 11 }],
  attendance: { totalLogsThisMonth: 180 },
  leaves: { byStatus: { APPROVED: 3 }, byMonth: [{ month: "2026-09", count: 3 }] },
  payroll: { totalCostYTD: "0" },
  expenses: { approvedYTD: "0" },
  joiningExitsTrend: [{ month: "Sep", joins: 1, exits: 0 }],
};

const EMPTY_ORG_OVERVIEW = {
  ...OVERVIEW,
  headcount: { total: 0, active: 0, newThisMonth: 0 },
  departments: [],
  gender: [],
  roles: [],
  attendance: { totalLogsThisMonth: 0 },
  leaves: { byStatus: {}, byMonth: [] },
  joiningExitsTrend: [],
};

const DEFAULTS: Record<string, unknown> = {
  "/hr/analytics": OVERVIEW,
  "/hr/analytics/attrition": {
    totalEmployees: 12,
    resignedThisYear: 1,
    attritionRatePercent: "8.3",
    byMonth: [],
  },
  "/hr/analytics-plus": {
    headcount: { total: 12, active: 11, probation: 1, notice: 0 },
    attritionRate12mo: 8.3,
    avgTenureMonths: 14,
    leaveUtilizationPct: 40,
    attendanceRatePct: 96,
    openCasesCount: 0,
    avgMood: null,
    payrollCostLastMonth: null,
  },
  "/hr/analytics-plus/attrition": {
    joinsVsExits: [],
    byDepartment: [],
    byReason: [],
  },
  "/hr/analytics-plus/leave-trends": { byTypeAndMonth: [], totalByType: [] },
  "/hr/analytics-plus/engagement": { moodByMonth: [] },
  "/hr/analytics-plus/performance-distribution": { distribution: [] },
  "/hr/analytics-plus/compliance-gaps": { openCases: [] },
  "/hr/analytics-plus/payroll-cost": { monthly: [] },
  "/hr/recruitment/stats": {
    openJobs: 2,
    totalCandidates: 0,
    interviewsScheduled: 0,
    offersExtended: 0,
  },
  "/me/org-display": { currency: "INR", locale: "en-IN" },
};

function respondPerPath(overrides: Record<string, unknown> = {}) {
  const routes = { ...DEFAULTS, ...overrides };
  mockedGet.mockImplementation((path: string) => {
    const value = routes[path.split("?")[0] ?? path];
    if (value instanceof Error) return Promise.reject(value);
    return Promise.resolve(value ?? {});
  });
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  mockedGet.mockReset();
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("HR analytics degrades in place, because the provider's default throwOnError made the page's own isError branch unreachable dead code", () => {
  it("renders its own retry rather than reaching the route error boundary", async () => {
    respondPerPath({
      "/hr/analytics": new ApiError("Internal server error", 500),
    });

    renderUnderBoundary(<AnalyticsPageClient />);

    expect(await screen.findByText("Analytics didn't load")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });

  it("quotes the backend's correlation id so support can join the request to its logs", async () => {
    respondPerPath({
      "/hr/analytics": new ApiError("Internal server error", 500, undefined, {
        correlationId: "req-abc123",
      }),
    });

    renderUnderBoundary(<AnalyticsPageClient />);

    expect(
      await screen.findByText(/req-abc123/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("offers the first step instead of a grid of zeroes when the organisation has nobody in it", async () => {
    respondPerPath({ "/hr/analytics": EMPTY_ORG_OVERVIEW });

    renderUnderBoundary(<AnalyticsPageClient />);

    expect(
      await screen.findByText("No people to report on yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Attrition Rate")).not.toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });
});

describe("a money-formatting read is decorative, so its failure must not take a page down", () => {
  it("keeps HR analytics rendering when /me/org-display fails", async () => {
    respondPerPath({
      "/hr/analytics": OVERVIEW,
      "/me/org-display": new ApiError("Internal server error", 500),
    });

    renderUnderBoundary(<AnalyticsPageClient />);

    expect(await screen.findByText("Total Employees")).toBeInTheDocument();
    expect(screen.queryByText("route error boundary")).not.toBeInTheDocument();
  });
});
