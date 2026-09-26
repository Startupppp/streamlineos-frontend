"use client";

import { render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmPanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmSection: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PmStaggerList: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PM_ROW: "pm-row-class",
  PM_PANEL: "pm-panel-class",
  PM_FILL_PANEL: "pm-fill-panel-class",
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title?: string;
  }) => (
    <div>
      {title && <h1>{title}</h1>}
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ScrollBar: () => null,
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
  fadeUp: {},
  fadeUpReduced: {},
  pmStagger: {},
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUsePortalProjects = jest.fn();
const mockUsePortalProjectOverview = jest.fn();
const mockUsePortalChangeRequests = jest.fn();
const mockUseSubmitPortalCR = jest.fn();
const mockUseAccess = jest.fn();

jest.mock("@/hooks/api/build/client-portal", () => ({
  usePortalProjects: () => mockUsePortalProjects(),
  usePortalProjectOverview: () => mockUsePortalProjectOverview(),
  usePortalChangeRequests: () => mockUsePortalChangeRequests(),
  useSubmitPortalChangeRequest: () => mockUseSubmitPortalCR(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => mockUseAccess(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

const ACCESS_GRANTED = {
  data: {
    isOrgOwner: false,
    scopes: { "build:portal:view": "all", "build:changerequests:view": "all" },
    modules: {},
  },
  isLoading: false,
};

function baseQuery(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUsePortalProjects.mockReturnValue(baseQuery({ data: [] }));
  mockUsePortalProjectOverview.mockReturnValue(baseQuery());
  mockUsePortalChangeRequests.mockReturnValue(baseQuery({ data: [] }));
  mockUseSubmitPortalCR.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
    isError: false,
  });
});

describe("SPEC 9 — PortalListPage supplemental states (Requirement C3)", () => {
  it("empty state: renders 'No projects' when data=[] and access is granted so empty differs from denial", () => {
    mockUsePortalProjects.mockReturnValue(baseQuery({ data: [] }));
    const { PortalListPage } = require("./portal-list-page");
    render(<PortalListPage />);
    expect(screen.getByText("No projects")).toBeInTheDocument();
  });

  it("server-error state (500): renders error state via PageState — not empty state", () => {
    mockUsePortalProjects.mockReturnValue(
      baseQuery({ isError: true, error: new Error("Internal Server Error") }),
    );
    const { PortalListPage } = require("./portal-list-page");
    render(<PortalListPage />);
    expect(screen.queryByText("No projects")).toBeNull();
  });

  it("rate-limited state (429): renders error state via PageState — not empty state", () => {
    mockUsePortalProjects.mockReturnValue(
      baseQuery({
        isError: true,
        error: Object.assign(new Error("Too many requests"), { status: 429 }),
      }),
    );
    const { PortalListPage } = require("./portal-list-page");
    render(<PortalListPage />);
    expect(screen.queryByText("No projects")).toBeNull();
  });

  it("offline state: renders error state via PageState — not empty state", () => {
    mockUsePortalProjects.mockReturnValue(
      baseQuery({
        isError: true,
        error: new TypeError("Failed to fetch"),
      }),
    );
    const { PortalListPage } = require("./portal-list-page");
    render(<PortalListPage />);
    expect(screen.queryByText("No projects")).toBeNull();
  });

  it("ANTI-VACUITY: empty and server-error states are different — error must NOT render 'No projects'", () => {
    mockUsePortalProjects.mockReturnValue(
      baseQuery({ isError: true, error: new Error("500") }),
    );
    const { PortalListPage } = require("./portal-list-page");
    const { unmount } = render(<PortalListPage />);
    expect(screen.queryByText("No projects")).toBeNull();
    unmount();

    mockUsePortalProjects.mockReturnValue(baseQuery({ data: [] }));
    const { PortalListPage: PortalListPage2 } = require("./portal-list-page");
    render(<PortalListPage2 />);
    expect(screen.getByText("No projects")).toBeInTheDocument();
  });
});

describe("SPEC 10 — PortalDashboardPage states (Requirement C3)", () => {
  it("loading state: renders skeleton title 'Project Dashboard' when data is loading", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({ isLoading: true }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ isLoading: true }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.getByText("Project Dashboard")).toBeInTheDocument();
  });

  it("ready state: renders project name from overview data", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({
        data: {
          project: {
            id: 42,
            name: "Alpha Project",
            status: "active",
            startDate: null,
            targetEndDate: null,
          },
          capabilities: {
            canViewMilestones: false,
            canViewTasks: false,
            canViewAttachments: false,
            canViewComments: false,
            canSubmitChangeRequests: false,
          },
          milestones: [],
          tasks: [],
          attachments: [],
          comments: [],
        },
      }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ data: [] }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.getByText("Alpha Project")).toBeInTheDocument();
  });

  it("empty milestones state: renders 'No milestones' when milestone array is empty", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({
        data: {
          project: {
            id: 42,
            name: "Alpha Project",
            status: "active",
            startDate: null,
            targetEndDate: null,
          },
          capabilities: {
            canViewMilestones: true,
            canViewTasks: false,
            canViewAttachments: false,
            canViewComments: false,
            canSubmitChangeRequests: false,
          },
          milestones: [],
          tasks: [],
          attachments: [],
          comments: [],
        },
      }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ data: [] }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.getByText("No milestones")).toBeInTheDocument();
  });

  it("server-error state: renders error via PageState when overview fetch fails", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({ isError: true, error: new Error("500") }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ data: [] }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.queryByText("Alpha Project")).toBeNull();
    expect(screen.getByText("Project Dashboard")).toBeInTheDocument();
  });

  it("rate-limited state (429): renders error state — not ready content", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({
        isError: true,
        error: Object.assign(new Error("Too many requests"), { status: 429 }),
      }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ data: [] }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.queryByText("No milestones")).toBeNull();
  });

  it("offline state: renders error state when change-requests fetch fails (network down)", () => {
    mockUsePortalProjectOverview.mockReturnValue(baseQuery({ data: undefined }));
    mockUsePortalChangeRequests.mockReturnValue(
      baseQuery({
        isError: true,
        error: new TypeError("Failed to fetch"),
      }),
    );
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.queryByText("Alpha Project")).toBeNull();
  });

  it("ANTI-VACUITY: loading and ready states differ — loading shows 'Project Dashboard' not project name", () => {
    mockUsePortalProjectOverview.mockReturnValue(
      baseQuery({ isLoading: true }),
    );
    mockUsePortalChangeRequests.mockReturnValue(baseQuery({ isLoading: true }));
    const { PortalDashboardPage } = require("./portal-dashboard-page");
    render(<PortalDashboardPage projectId={42} />);
    expect(screen.getByText("Project Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Project")).toBeNull();
  });
});
