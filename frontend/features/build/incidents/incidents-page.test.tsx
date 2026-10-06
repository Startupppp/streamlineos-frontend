import React from "react";
import { render, screen } from "@testing-library/react";
import { IncidentsPage } from "./incidents-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/1/incidents",
}));

jest.mock("@/hooks/api/build/incidents", () => ({
  useIncidents: jest.fn(),
}));

jest.mock("@/hooks/api/build/incident-mutations", () => ({
  useDeleteIncident: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/features/build/shared/use-build-list-filters", () => ({
  BUILD_FILTER_ALL: "all",
  useBuildListFilters: jest.fn(),
}));

jest.mock("@/hooks/common/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: ({ data }: { data: unknown[] }) => (
    <div data-testid="data-table" data-rows={data.length} />
  ),
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => <div data-testid="no-permission" />,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions ? <div data-testid="page-actions">{actions}</div> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("@/components/ui/stat-card", () => ({
  StatCard: () => <div data-testid="stat-card" />,
  StatCardGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("./incident-sheet", () => ({ IncidentSheet: () => null }));
jest.mock("./sla", () => ({
  getSlaState: jest.fn(() => ({ responseBreached: false, resolutionBreached: false })),
}));
jest.mock("./incidents-table-columns", () => ({
  INCIDENTS_TABLE_HEADERS: ["Title", "Severity", "Status", "Owner"],
  buildIncidentsColumns: jest.fn(() => []),
  IncidentMobileCard: () => null,
}));

import { useIncidents } from "@/hooks/api/build/incidents";
import { useDeleteIncident } from "@/hooks/api/build/incident-mutations";
import { useCan, useAccess } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";

const mockUseIncidents = useIncidents as jest.Mock;
const mockUseDeleteIncident = useDeleteIncident as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;
const mockUseOrgMembers = useOrgMembers as jest.Mock;
const mockUseBuildListFilters = useBuildListFilters as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:incidents:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
    ...overrides,
  };
}

function incidentPages(rows: unknown[]) {
  return { pages: [{ data: rows }] };
}

function defaultFilters(overrides: Record<string, unknown> = {}) {
  return {
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    clearAll: jest.fn(),
    isFiltered: false,
    resetKey: "0",
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    ...overrides,
  };
}

const incidentRow = {
  id: 1,
  projectId: 1,
  incidentNumber: 1,
  title: "Database outage",
  status: "detected",
  severity: "critical",
  ownerId: null,
  detectedAt: "2026-09-01T00:00:00Z",
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

beforeEach(() => {
  mockUseCan.mockReturnValue(false);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseIncidents.mockReturnValue(baseQueryResult({ data: incidentPages([]) }));
  mockUseDeleteIncident.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseOrgMembers.mockReturnValue({ data: { data: [] } });
  mockUseBuildListFilters.mockReturnValue(defaultFilters());
});

it("shows loading skeleton while access is loading and not error state", () => {
  mockUseAccess.mockReturnValue(ACCESS_LOADING);
  mockUseIncidents.mockReturnValue(baseQueryResult());
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
});

it("shows NoPermissionState when build:incidents:view is denied and not the data table", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  mockUseIncidents.mockReturnValue(baseQueryResult());
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows error state when the query fails and not the skeleton", () => {
  mockUseIncidents.mockReturnValue(
    baseQueryResult({ isError: true, error: new Error("Network error") }),
  );
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("error-state")).toBeInTheDocument();
  expect(screen.queryByTestId("data-table-skeleton")).not.toBeInTheDocument();
});

it("surfaces the 402 upgrade path from the backend rather than a generic error state (FE-41)", () => {
  mockUseIncidents.mockReturnValue(
    baseQueryResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<IncidentsPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
    "href",
    "/settings/billing",
  );
});

it("renders the data table when rows are present and not the empty state", () => {
  mockUseIncidents.mockReturnValue(
    baseQueryResult({ data: incidentPages([incidentRow]) }),
  );
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("data-table")).toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
});

it("shows 'No incidents found' empty state when there are no rows and no active filter", () => {
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent("No incidents found");
  expect(screen.queryByTestId("data-table")).not.toBeInTheDocument();
});

it("shows 'No incidents match your filters' when filters are active and no rows match", () => {
  mockUseBuildListFilters.mockReturnValue(defaultFilters({ isFiltered: true }));
  render(<IncidentsPage projectId={1} />);
  expect(screen.getByTestId("empty-state")).toHaveTextContent(
    "No incidents match your filters",
  );
  expect(screen.queryByText("No incidents found")).not.toBeInTheDocument();
});

it("hides the New Incident button when build:incidents:manage is denied", () => {
  mockUseCan.mockReturnValue(false);
  render(<IncidentsPage projectId={1} />);
  expect(screen.queryByRole("button", { name: /new incident/i })).not.toBeInTheDocument();
});

it("shows the New Incident button when build:incidents:manage is granted", () => {
  mockUseCan.mockReturnValue(true);
  render(<IncidentsPage projectId={1} />);
  expect(screen.getAllByRole("button", { name: /new incident/i }).length).toBeGreaterThan(0);
});

describe("BUG-044 — IncidentSlaBadge must show em-dash not On track when no SLA dates are configured", () => {
  const { IncidentSlaBadge } = jest.requireActual("./incidents-table-columns") as typeof import("./incidents-table-columns");
  type MinIncident = React.ComponentProps<typeof IncidentSlaBadge>["incident"];

  function makeIncident(overrides: Partial<MinIncident> = {}): MinIncident {
    return {
      id: 1,
      orgId: "org-1",
      projectId: 1,
      incidentNumber: 1,
      title: "Service down",
      description: null,
      severity: "high",
      status: "detected",
      impact: null,
      ownerId: null,
      rootCause: null,
      customerComms: null,
      detectedAt: null,
      respondedAt: null,
      resolvedAt: null,
      responseDueAt: null,
      resolutionDueAt: null,
      linkedTicketId: null,
      releaseId: null,
      createdBy: null,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
      deletedAt: null,
      ...overrides,
    } as MinIncident;
  }

  it("renders em-dash and not On track when both responseDueAt and resolutionDueAt are null (no SLA configured)", () => {
    render(<IncidentSlaBadge incident={makeIncident()} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("On track")).not.toBeInTheDocument();
  });

  it("renders On track badge when responseDueAt is set to a future time and incident is not resolved (positive control confirms badge still works)", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    render(<IncidentSlaBadge incident={makeIncident({ responseDueAt: future })} />);
    expect(screen.getByText("On track")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});
