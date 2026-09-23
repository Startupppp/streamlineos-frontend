import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api-client";
import { useCan, useScope } from "@/hooks/api/access";
import { ApprovalSlaTab } from "./approval-sla-tab";
import { BillingLeakageTab } from "./billing-leakage-tab";
import { ClientProfitabilityTab } from "./client-profitability-tab";
import { ComplianceTab } from "./compliance-tab";
import { ProjectBudgetsTab } from "./project-budgets-tab";
import { ReportsView } from "./reports-view";
import { UtilizationTab } from "./utilization-tab";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => "/timesheets/reports",
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/access", () => {
  const useCan = jest.fn();
  return {
    useCan,
    useScope: jest.fn(),
    useModuleEnabled: jest.fn(() => true),
    usePermissionGate: jest.fn(() => ({
      permission: "timesheets:reports:view",
      allowed: true,
      denied: false,
      pending: false,
    })),
    useCanState: jest.fn(() => (useCan() ? "granted" : "denied")),
    useAccess: jest.fn(() => ({
      data: { scopes: {}, modules: {}, isOrgOwner: false },
      refetch: jest.fn(),
    })),
  };
});

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
  newIdempotencyKey: () => "test-key",
}));

const get = apiClient.get as jest.Mock;
const can = useCan as jest.Mock;
const scope = useScope as jest.Mock;

const REPORT_URLS = [
  "/timesheets/reports/overview",
  "/timesheets/reports/utilization",
  "/timesheets/reports/client-profitability",
  "/timesheets/reports/compliance",
  "/timesheets/reports/approval-sla",
  "/timesheets/reports/billing-leakage",
  "/timesheets/budgets",
] as const;

const RANGE = { startDate: "2026-08-11", endDate: "2026-09-09" };

const RESPONSES: Record<string, unknown> = {
  "/timesheets/reports/overview": {
    ...RANGE,
    totals: { totalHours: 0, billableHours: 0, nonBillableHours: 0 },
    byProject: [],
    byDay: [],
  },
  "/timesheets/reports/utilization": {
    ...RANGE,
    summary: {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      billableUtilization: 0,
      activeUsers: 0,
    },
    users: [],
  },
  "/timesheets/reports/client-profitability": { ...RANGE, clients: [] },
  "/timesheets/reports/compliance": { ...RANGE, expectedWeeklyHours: null, users: [] },
  "/timesheets/reports/approval-sla": {
    ...RANGE,
    totalSubmitted: 0,
    byStatus: {},
    avgHoursToDecision: null,
    oldestPending: null,
    perApprover: [],
  },
  "/timesheets/reports/billing-leakage": {
    ...RANGE,
    billableHours: 0,
    nonBillableHours: 0,
    writeOffRate: 0,
    approvedBillableUninvoiced: { hours: 0, amounts: [] },
    missingRateHours: 0,
    voidedHours: 0,
  },
  "/timesheets/budgets": [],
};

function requestedUrls(): string[] {
  return get.mock.calls.map((call) => String(call[0]));
}

function reportRequests(): string[] {
  return requestedUrls().filter((url) =>
    REPORT_URLS.some((known) => url === known),
  );
}

function renderReports() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    );
  }
  return render(<ReportsView />, { wrapper: Wrapper });
}

beforeAll(() => {
  Element.prototype.hasPointerCapture = jest.fn(() => false);
  Element.prototype.setPointerCapture = jest.fn();
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

describe("timesheet reports tabs fetch only when active", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    can.mockReturnValue(true);
    scope.mockReturnValue("all");
    get.mockImplementation((url: string) =>
      Promise.resolve(RESPONSES[url] ?? {}),
    );
  });

  it("requests only the overview on first paint, and nothing for the other six tabs", async () => {
    renderReports();

    await waitFor(() =>
      expect(reportRequests()).toContain("/timesheets/reports/overview"),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reportRequests()).toEqual(["/timesheets/reports/overview"]);
  });

  it("fetches a tab's endpoint exactly once when it becomes active", async () => {
    const user = userEvent.setup();
    renderReports();

    await waitFor(() =>
      expect(reportRequests()).toContain("/timesheets/reports/overview"),
    );

    mockSearchParams = new URLSearchParams("tab=utilization");
    await user.click(screen.getByRole("tab", { name: "Utilization" }));

    await waitFor(() =>
      expect(reportRequests()).toContain("/timesheets/reports/utilization"),
    );

    const utilizationCalls = reportRequests().filter(
      (url) => url === "/timesheets/reports/utilization",
    );
    expect(utilizationCalls).toHaveLength(1);
  });

  it("never touches the four tabs that were never opened", async () => {
    const user = userEvent.setup();
    renderReports();

    mockSearchParams = new URLSearchParams("tab=compliance");
    await user.click(screen.getByRole("tab", { name: "Compliance" }));

    await waitFor(() =>
      expect(reportRequests()).toContain("/timesheets/reports/compliance"),
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    const seen = new Set(reportRequests());
    expect(seen.has("/timesheets/reports/utilization")).toBe(false);
    expect(seen.has("/timesheets/reports/client-profitability")).toBe(false);
    expect(seen.has("/timesheets/reports/approval-sla")).toBe(false);
    expect(seen.has("/timesheets/reports/billing-leakage")).toBe(false);
    expect(seen.has("/timesheets/budgets")).toBe(false);
  });

  it("makes no report request at all when the viewer cannot read reports", async () => {
    can.mockReturnValue(false);

    renderReports();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reportRequests()).toEqual([]);
  });
});

describe("each report tab's own enabled guard", () => {
  const TABS: {
    name: string;
    url: string;
    render: (enabled: boolean) => ReactNode;
  }[] = [
    {
      name: "Utilization",
      url: "/timesheets/reports/utilization",
      render: (enabled) => <UtilizationTab params={RANGE} enabled={enabled} />,
    },
    {
      name: "Project Budgets",
      url: "/timesheets/budgets",
      render: (enabled) => <ProjectBudgetsTab enabled={enabled} />,
    },
    {
      name: "Client Profitability",
      url: "/timesheets/reports/client-profitability",
      render: (enabled) => <ClientProfitabilityTab params={RANGE} enabled={enabled} />,
    },
    {
      name: "Compliance",
      url: "/timesheets/reports/compliance",
      render: (enabled) => <ComplianceTab params={RANGE} enabled={enabled} />,
    },
    {
      name: "Approval SLA",
      url: "/timesheets/reports/approval-sla",
      render: (enabled) => <ApprovalSlaTab params={RANGE} enabled={enabled} />,
    },
    {
      name: "Billing Leakage",
      url: "/timesheets/reports/billing-leakage",
      render: (enabled) => <BillingLeakageTab params={RANGE} enabled={enabled} />,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    can.mockReturnValue(true);
    scope.mockReturnValue("all");
    get.mockImplementation((url: string) => Promise.resolve(RESPONSES[url] ?? {}));
  });

  function renderTab(node: ReactNode) {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{node}</TooltipProvider>
      </QueryClientProvider>,
    );
  }

  it.each(TABS)("$name makes no request while mounted but inactive", async ({ render: renderNode }) => {
    renderTab(renderNode(false));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reportRequests()).toEqual([]);
  });

  it.each(TABS)("$name requests $url exactly once when active", async ({ url, render: renderNode }) => {
    renderTab(renderNode(true));

    await waitFor(() => expect(reportRequests()).toEqual([url]));
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(reportRequests()).toEqual([url]);
  });
});
