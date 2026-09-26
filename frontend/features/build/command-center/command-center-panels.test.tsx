import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ApprovalsPanel } from "./command-center-approvals-panel";
import { AgentRunsPanel } from "./command-center-agent-runs-panel";
import { RisksPanel } from "./command-center-risks-panel";
import { ReleasesPanel } from "./command-center-releases-panel";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useCanState: jest.fn(),
}));

jest.mock("@/hooks/api/build/approvals", () => ({
  useApprovalInbox: jest.fn(),
}));

jest.mock("@/hooks/api/build/agent-pulse", () => ({
  useAgentPulse: jest.fn(),
}));

jest.mock("@/hooks/api/build/governance", () => ({
  useOrgRisks: jest.fn(),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useOrgReleases: jest.fn(),
}));

jest.mock("@/lib/build/build-scope", () => ({
  ORGANIZATION_BUILD_SCOPE: { type: "organization", managedProductId: null, projectId: null, basePath: "/build" },
  buildScopeKey: () => "org",
}));

jest.mock("@/components/pm-chrome", () => ({
  PmSection: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, asChild }: { children: ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button>{children}</button>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("./panel-header", () => ({
  PanelHeader: ({ title }: { title: string }) => <div data-testid="panel-header">{title}</div>,
}));

jest.mock("./command-center-constants", () => ({
  COMMAND_CENTER_LIST_PANEL: "",
  COMMAND_CENTER_PANEL_BODY_SCROLL: "",
}));

import { useCanState } from "@/hooks/api/access";
import { useApprovalInbox } from "@/hooks/api/build/approvals";
import { useAgentPulse } from "@/hooks/api/build/agent-pulse";
import { useOrgRisks } from "@/hooks/api/build/governance";
import { useOrgReleases } from "@/hooks/api/build/releases";

const mockUseCanState = useCanState as jest.Mock;
const mockUseApprovalInbox = useApprovalInbox as jest.Mock;
const mockUseAgentPulse = useAgentPulse as jest.Mock;
const mockUseOrgRisks = useOrgRisks as jest.Mock;
const mockUseOrgReleases = useOrgReleases as jest.Mock;

function baseQueryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCanState.mockReturnValue("granted");
  mockUseApprovalInbox.mockReturnValue(baseQueryResult());
  mockUseAgentPulse.mockReturnValue(baseQueryResult());
  mockUseOrgRisks.mockReturnValue(baseQueryResult());
  mockUseOrgReleases.mockReturnValue(baseQueryResult());
});

describe("ApprovalsPanel", () => {
  it("renders nothing when the user is denied build:approvals:view — paired with the granted test below", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<ApprovalsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the panel header when the user has build:approvals:view — paired with the denied test above", () => {
    render(<ApprovalsPanel />);
    expect(screen.getByTestId("panel-header")).toBeInTheDocument();
  });

  it("renders skeletons while access or data is loading", () => {
    mockUseCanState.mockReturnValue("loading");
    render(<ApprovalsPanel />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders the error state when the query fails — paired with the success state test", () => {
    mockUseApprovalInbox.mockReturnValue(
      baseQueryResult({ isError: true, error: new Error("fetch failed") }),
    );
    render(<ApprovalsPanel />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no pending approvals — paired with the populated test", () => {
    mockUseApprovalInbox.mockReturnValue(
      baseQueryResult({ data: { pages: [{ data: [], pagination: { hasMore: false, nextCursor: null, limit: 25 } }] } }),
    );
    render(<ApprovalsPanel />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders approval rows when data is present — paired with the empty-state test", () => {
    mockUseApprovalInbox.mockReturnValue(
      baseQueryResult({
        data: {
          pages: [{
            data: [{ id: 1, title: "Budget approval", entityType: "budget", status: "pending", level: 1, projectId: null, projectName: null, projectKey: null, dueAt: null, requestedById: null, decidedAt: null }],
            pagination: { hasMore: false, nextCursor: null, limit: 25 },
          }],
        },
      }),
    );
    render(<ApprovalsPanel />);
    expect(screen.getByText("Budget approval")).toBeInTheDocument();
  });
});

describe("AgentRunsPanel", () => {
  it("renders nothing when the user is denied build:approvals:view — paired with the granted test below", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<AgentRunsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the panel header when the user has build:approvals:view — paired with the denied test above", () => {
    render(<AgentRunsPanel />);
    expect(screen.getByTestId("panel-header")).toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    mockUseCanState.mockReturnValue("loading");
    render(<AgentRunsPanel />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders the error state when the agent pulse query fails — paired with the success state test", () => {
    mockUseAgentPulse.mockReturnValue(
      baseQueryResult({ isError: true, error: new Error("network error") }),
    );
    render(<AgentRunsPanel />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when the agent has no signal (null) — paired with the signal-present test", () => {
    mockUseAgentPulse.mockReturnValue(baseQueryResult({ data: null }));
    render(<AgentRunsPanel />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders signal details when the agent pulse returns a signal — paired with the null-signal test", () => {
    mockUseAgentPulse.mockReturnValue(
      baseQueryResult({
        data: {
          title: "Milestone blocked",
          entityId: 5,
          projectId: 1,
          dueAt: null,
          type: "blocked_milestone",
          confidence: 87,
          evidence: "Three dependencies are overdue",
          proposedChange: null,
        },
      }),
    );
    render(<AgentRunsPanel />);
    expect(screen.getByText("Milestone blocked")).toBeInTheDocument();
    expect(screen.getByText(/87% confidence/)).toBeInTheDocument();
  });
});

describe("RisksPanel", () => {
  it("renders nothing when the user is denied build:risks:view — paired with the granted test below", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<RisksPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the panel header when the user has build:risks:view — paired with the denied test above", () => {
    render(<RisksPanel />);
    expect(screen.getByTestId("panel-header")).toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    mockUseCanState.mockReturnValue("loading");
    render(<RisksPanel />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders the error state when the risks query fails — paired with the success state test", () => {
    mockUseOrgRisks.mockReturnValue(
      baseQueryResult({ isError: true, error: new Error("500") }),
    );
    render(<RisksPanel />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no open risks — paired with the populated test", () => {
    mockUseOrgRisks.mockReturnValue(baseQueryResult({ data: { data: [], hasMore: false, nextCursor: null } }));
    render(<RisksPanel />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders risk rows when data is present — paired with the empty-state test", () => {
    mockUseOrgRisks.mockReturnValue(
      baseQueryResult({
        data: {
          data: [{
            id: 1, orgId: "o1", projectId: 1, riskNumber: 1,
            title: "Data breach risk", impact: "high", probability: "low",
            status: "open", ownerId: null, mitigation: null, linkedTicketId: null,
            createdBy: null, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z", deletedAt: null,
          }],
          hasMore: false,
          nextCursor: null,
        },
      }),
    );
    render(<RisksPanel />);
    expect(screen.getByText("Data breach risk")).toBeInTheDocument();
  });
});

describe("ReleasesPanel", () => {
  it("renders nothing when the user is denied build:view — paired with the granted test below", () => {
    mockUseCanState.mockReturnValue("denied");
    const { container } = render(<ReleasesPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the panel header when the user has build:view — paired with the denied test above", () => {
    render(<ReleasesPanel />);
    expect(screen.getByTestId("panel-header")).toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    mockUseCanState.mockReturnValue("loading");
    render(<ReleasesPanel />);
    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
  });

  it("renders the error state when the releases query fails — paired with the success state test", () => {
    mockUseOrgReleases.mockReturnValue(
      baseQueryResult({ isError: true, error: new Error("403") }),
    );
    render(<ReleasesPanel />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("renders the empty state when there are no releases — paired with the populated test", () => {
    mockUseOrgReleases.mockReturnValue(
      baseQueryResult({
        data: { data: [], pagination: { limit: 50, hasMore: false, nextCursor: null } },
      }),
    );
    render(<ReleasesPanel />);
    expect(screen.getByTestId("empty-state")).toBeInTheDocument();
  });

  it("renders release rows when data is present — paired with the empty-state test", () => {
    mockUseOrgReleases.mockReturnValue(
      baseQueryResult({
        data: {
          data: [{
            id: 1, projectId: 2, name: "v1.0 Launch", version: "1.0.0",
            description: null, status: "draft", releaseDate: null,
            ticketCount: 3, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z",
          }],
          pagination: { limit: 50, hasMore: false, nextCursor: null },
        },
      }),
    );
    render(<ReleasesPanel />);
    expect(screen.getByText("v1.0 Launch")).toBeInTheDocument();
    expect(screen.getByText("1.0.0")).toBeInTheDocument();
  });
});
