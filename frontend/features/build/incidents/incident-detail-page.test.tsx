import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/lib/api-envelope";
import type { Incident, IncidentDetail } from "@/hooks/api/build/incidents-schema";
import { getSlaState } from "./sla";

const mockUseIncident = jest.fn();
const mockUseDeleteIncident = jest.fn();
const mockUseProjectMembers = jest.fn();
const mockUseReleases = jest.fn();
const mockUseTicket = jest.fn();
const mockUseCan = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/build/incidents", () => ({
  useIncident: (...args: unknown[]) => mockUseIncident(...args),
  useDeleteIncident: () => mockUseDeleteIncident(),
}));

jest.mock("@/hooks/api/build/project-members", () => ({
  useProjectMembers: (...args: unknown[]) => mockUseProjectMembers(...args),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: (...args: unknown[]) => mockUseReleases(...args),
}));

jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicket: (...args: unknown[]) => mockUseTicket(...args),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: (...args: unknown[]) => mockUseCan(...args),
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: (props: React.HTMLAttributes<HTMLElement>) => <span {...props} />,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: ReactNode; title?: ReactNode }) => (
    <div>{title ? <h1>{title}</h1> : null}{children}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

jest.mock("./incident-sla-panel", () => ({
  IncidentSlaPanel: () => null,
}));

jest.mock("./incident-timeline", () => ({
  IncidentTimeline: () => null,
}));

jest.mock("./incident-sheet", () => ({
  IncidentSheet: () => null,
}));

jest.mock("./incident-decisions", () => ({
  IncidentDecisions: () => null,
}));

jest.mock("./incident-follow-ups", () => ({
  IncidentFollowUps: () => null,
}));

import { IncidentDetailPage } from "./incident-detail-page";

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:incidents:view": "all" }, modules: {} },
  isLoading: false,
};
const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};
const ACCESS_LOADING = { data: undefined, isLoading: true };

function baseQuery(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    ...overrides,
  };
}

function baseIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 1,
    orgId: "org_1",
    projectId: 1,
    incidentNumber: 1,
    title: "Payments outage",
    description: null,
    severity: "critical",
    status: "detected",
    impact: null,
    ownerId: null,
    rootCause: null,
    customerComms: null,
    detectedAt: "2026-01-01T00:00:00.000Z",
    respondedAt: null,
    resolvedAt: null,
    responseDueAt: null,
    resolutionDueAt: null,
    linkedTicketId: null,
    releaseId: null,
    createdBy: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseIncidentDetail(overrides: Partial<IncidentDetail> = {}): IncidentDetail {
  return {
    ...baseIncident(),
    updates: [],
    decisions: [],
    followUpActions: [],
    childrenPagination: {
      updates: { limit: 100, hasMore: false, nextCursor: null },
      decisions: { limit: 100, hasMore: false, nextCursor: null },
      followUpActions: { limit: 100, hasMore: false, nextCursor: null },
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseIncident.mockReturnValue(baseQuery());
  mockUseProjectMembers.mockReturnValue(baseQuery({ data: [] }));
  mockUseReleases.mockReturnValue(baseQuery({ data: [] }));
  mockUseTicket.mockReturnValue(baseQuery({ data: null }));
  mockUseDeleteIncident.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("IncidentDetailPage page-state gating", () => {
  it("renders NoPermissionState when build:incidents:view is denied instead of a false not-found empty state", () => {
    mockUseAccess.mockReturnValue(ACCESS_DENIED);
    render(<IncidentDetailPage projectId={1} incidentId={1} />);
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows loading state while the access snapshot is still in flight rather than a false denial", () => {
    mockUseAccess.mockReturnValue(ACCESS_LOADING);
    render(<IncidentDetailPage projectId={1} incidentId={1} />);
    expect(screen.queryByText(/access restricted/i)).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("renders the upgrade path the backend sent with a 402 rather than a generic failure", () => {
    const err = new ApiError("Build is not included in your current plan.", 402, "MODULE_NOT_ENABLED", {
      moduleKey: "build",
      reason: "not-in-plan",
      upgradePath: "/settings/billing",
    });
    mockUseIncident.mockReturnValue(baseQuery({ isError: true, error: err }));
    render(<IncidentDetailPage projectId={1} incidentId={1} />);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plan|billing|upgrade/i })).toHaveAttribute(
      "href",
      "/settings/billing",
    );
  });

  it("renders the not-found empty state only once access is granted and the incident is genuinely absent", () => {
    mockUseIncident.mockReturnValue(baseQuery());
    render(<IncidentDetailPage projectId={1} incidentId={999} />);
    expect(screen.getByTestId("empty-state")).toHaveTextContent(/incident not found/i);
  });

  it("renders the incident once access is granted and data has loaded", () => {
    mockUseIncident.mockReturnValue(baseQuery({ data: baseIncidentDetail() }));
    render(<IncidentDetailPage projectId={1} incidentId={1} />);
    expect(screen.getByRole("heading", { name: "Payments outage" })).toBeInTheDocument();
  });
});

describe("getSlaState", () => {
  it("does not report a response breach when the response was recorded before its due date", () => {
    const incident = baseIncident({
      responseDueAt: "2026-01-01T02:00:00.000Z",
      respondedAt: "2026-01-01T01:00:00.000Z",
    });
    expect(getSlaState(incident).responseBreached).toBe(false);
  });

  it("reports a response breach when the response was recorded after its due date, even though it has since happened", () => {
    const incident = baseIncident({
      responseDueAt: "2026-01-01T01:00:00.000Z",
      respondedAt: "2026-01-01T05:00:00.000Z",
    });
    expect(getSlaState(incident).responseBreached).toBe(true);
  });

  it("labels a late resolution as Resolution breached rather than Met", () => {
    const incident = baseIncident({
      resolutionDueAt: "2026-01-01T01:00:00.000Z",
      resolvedAt: "2026-01-01T05:00:00.000Z",
    });
    const state = getSlaState(incident);
    expect(state.resolutionBreached).toBe(true);
    expect(state.label).toBe("Resolution breached");
  });

  it("labels an on-time resolution as Met", () => {
    const incident = baseIncident({
      resolutionDueAt: "2026-01-01T05:00:00.000Z",
      resolvedAt: "2026-01-01T01:00:00.000Z",
    });
    const state = getSlaState(incident);
    expect(state.resolutionBreached).toBe(false);
    expect(state.label).toBe("Met");
  });

  it("treats an unparsable due date as not breached instead of a NaN comparison", () => {
    const incident = baseIncident({ responseDueAt: "not-a-date" });
    expect(getSlaState(incident, new Date("2026-06-01T00:00:00.000Z")).responseBreached).toBe(false);
  });
});
