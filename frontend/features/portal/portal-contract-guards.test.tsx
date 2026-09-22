import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PortalProjectCard } from "./components/portal-project-card";
import { PortalProjectDetail } from "./components/portal-project-detail";
import type { PortalProject, PortalProjectOverview, PortalCapabilities } from "./lib/portal-types";

let mockSubmitHook: jest.Mock;

jest.mock("@/hooks/api/portal/use-submit-change-request", () => ({
  useSubmitChangeRequest: (...args: unknown[]) => mockSubmitHook(...args),
}));

jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

beforeEach(() => {
  mockSubmitHook = jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
    reset: jest.fn(),
  }));
});

function withQueryClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const baseProject: PortalProject = {
  id: 42,
  name: "Acme Rebrand",
  key: "ACR",
  status: "active",
  startDate: null,
  targetEndDate: null,
};

const allGranted: PortalCapabilities = {
  canViewMilestones: true,
  canViewTasks: true,
  canViewAttachments: true,
  canViewComments: true,
  canSubmitChangeRequests: true,
};

const overviewWithAllGranted: PortalProjectOverview = {
  project: baseProject,
  capabilities: allGranted,
  milestones: [],
  tasks: [],
  attachments: [],
  comments: [],
};

const overviewWithoutCapabilities: PortalProjectOverview = {
  project: baseProject,
  milestones: [],
  tasks: [],
  attachments: [],
  comments: [],
};

describe("PortalProjectCard — optional capabilities field", () => {
  it("renders the project name without crashing when capabilities is absent", () => {
    withQueryClient(<PortalProjectCard project={baseProject} />);
    expect(screen.getByText("Acme Rebrand")).toBeInTheDocument();
  });

  it("does not render capability chips when capabilities is absent from the project", () => {
    withQueryClient(<PortalProjectCard project={baseProject} />);
    expect(screen.queryByText("Milestones")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
  });

  it("renders only the chips matching the grant when capabilities is present", () => {
    const projectWithCaps: PortalProject = {
      ...baseProject,
      capabilities: {
        canViewMilestones: true,
        canViewTasks: false,
        canViewAttachments: false,
        canViewComments: false,
        canSubmitChangeRequests: false,
      },
    };
    withQueryClient(<PortalProjectCard project={projectWithCaps} />);
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
  });
});

describe("PortalProjectDetail — case 1: old backend (no capabilities field)", () => {
  it("parses and renders without crashing when the backend omits capabilities entirely", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithoutCapabilities} />);
    expect(screen.getByRole("heading", { name: "Acme Rebrand" })).toBeInTheDocument();
  });

  it("hides all four sections when capabilities is absent — FAIL CLOSED", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithoutCapabilities} />);
    expect(screen.queryByText("Milestones")).not.toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("Files")).not.toBeInTheDocument();
    expect(screen.queryByText("Updates")).not.toBeInTheDocument();
  });

  it("hides the Request change button when capabilities is absent — FAIL CLOSED", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithoutCapabilities} />);
    expect(screen.queryByText("Request change")).not.toBeInTheDocument();
  });
});

describe("PortalProjectDetail — case 2: new backend (all capabilities true, positive control)", () => {
  it("renders all four sections when every view capability is granted", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithAllGranted} />);
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Files")).toBeInTheDocument();
    expect(screen.getByText("Updates")).toBeInTheDocument();
  });

  it("renders the Request change button when canSubmitChangeRequests is true", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithAllGranted} />);
    expect(screen.getByText("Request change")).toBeInTheDocument();
  });

  it("renders empty states for visible sections when backend returned empty arrays", () => {
    withQueryClient(<PortalProjectDetail data={overviewWithAllGranted} />);
    expect(screen.getByText("No milestones")).toBeInTheDocument();
    expect(screen.getByText("No tasks")).toBeInTheDocument();
    expect(screen.getByText("No attachments")).toBeInTheDocument();
    expect(screen.getByText("No updates yet")).toBeInTheDocument();
  });
});

describe("PortalProjectDetail — case 3: partial grant (view true, submit false)", () => {
  it("renders sections when view capabilities are granted but hides the change request button", () => {
    const viewOnlyOverview: PortalProjectOverview = {
      ...overviewWithAllGranted,
      capabilities: { ...allGranted, canSubmitChangeRequests: false },
    };
    withQueryClient(<PortalProjectDetail data={viewOnlyOverview} />);
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.queryByText("Request change")).not.toBeInTheDocument();
  });

  it("renders only the section for the single granted view capability", () => {
    const milestonesOnlyOverview: PortalProjectOverview = {
      ...overviewWithoutCapabilities,
      capabilities: {
        canViewMilestones: true,
        canViewTasks: false,
        canViewAttachments: false,
        canViewComments: false,
        canSubmitChangeRequests: false,
      },
    };
    withQueryClient(<PortalProjectDetail data={milestonesOnlyOverview} />);
    expect(screen.getByText("Milestones")).toBeInTheDocument();
    expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
    expect(screen.queryByText("Files")).not.toBeInTheDocument();
    expect(screen.queryByText("Updates")).not.toBeInTheDocument();
  });
});

describe("ChangeRequestDialog — projectId is from server-validated route data, not client input", () => {
  it("useSubmitChangeRequest is invoked with project.id from the backend-validated overview", () => {
    const overviewWithId99: PortalProjectOverview = {
      ...overviewWithAllGranted,
      project: { ...baseProject, id: 99 },
    };
    withQueryClient(<PortalProjectDetail data={overviewWithId99} />);
    expect(mockSubmitHook).toHaveBeenCalledWith(99);
  });

  it("a different project id in the overview calls the hook with that id, not a stale one", () => {
    const overviewA: PortalProjectOverview = {
      ...overviewWithAllGranted,
      project: { ...baseProject, id: 7 },
    };
    withQueryClient(<PortalProjectDetail data={overviewA} />);
    expect(mockSubmitHook).toHaveBeenCalledWith(7);
    expect(mockSubmitHook).not.toHaveBeenCalledWith(42);
  });
});
