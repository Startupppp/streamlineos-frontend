import { render, screen } from "@testing-library/react";
import { ProjectOverviewPage } from "./project-overview-page";

let mockSearchParams = new URLSearchParams();

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/101",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (...args: unknown[]) => usePageState(...args),
}));

jest.mock("@/hooks/api/build/projects", () => ({
  useProject: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/advanced", () => ({
  useProjectAnalytics: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
  useCycles: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/ticket-queries", () => ({
  useTicketColumnCounts: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/milestones", () => ({
  useProjectMilestones: jest.fn(() => ({
    data: [],
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  })),
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/hooks/api/build/project-activity", () => ({
  useProjectActivity: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
});

describe("ProjectOverviewPage", () => {
  it("renders access-restricted state when permission is denied so denial is never silently empty", () => {
    usePageState.mockReturnValue({ kind: "denied", permission: "build:view" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText(/access restricted/i)).toBeInTheDocument();
  });

  it("renders open-issues, active-cycle and health stat cards in the populated state", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProject } = jest.requireMock("@/hooks/api/build/projects");
    (useProject as jest.Mock).mockReturnValue({
      data: { id: 101, name: "Mobile App", key: "MA", description: "The app", status: "ACTIVE" },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    const { useTicketColumnCounts } = jest.requireMock("@/hooks/api/build/ticket-queries");
    (useTicketColumnCounts as jest.Mock).mockReturnValue({
      data: { Todo: 3, "In Progress": 2 },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Open issues")).toBeInTheDocument();
    expect(screen.getByText("Active cycle")).toBeInTheDocument();
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("renders the Progress stat card with completion percentage from analytics healthBreakdown", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");
    (useProjectAnalytics as jest.Mock).mockReturnValue({
      data: {
        healthStatus: "GOOD",
        healthScore: 65,
        healthBreakdown: { completionPct: 72, onTimePct: 80, velocityScore: 60, overdueTickets: 3, totalTickets: 25 },
        stateDistribution: [],
        priorityBreakdown: [],
        assigneeCompletion: [],
        volumeOverTime: [],
        cycleVelocity: [],
        estimateVsActual: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
  });

  it("renders the Overdue stat card with count from analytics healthBreakdown so risks are visible without navigating to issues", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");
    (useProjectAnalytics as jest.Mock).mockReturnValue({
      data: {
        healthStatus: "AT_RISK",
        healthScore: 45,
        healthBreakdown: { completionPct: 40, onTimePct: 60, velocityScore: 50, overdueTickets: 8, totalTickets: 20 },
        stateDistribution: [],
        priorityBreakdown: [],
        assigneeCompletion: [],
        volumeOverTime: [],
        cycleVelocity: [],
        estimateVsActual: [],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders quick-nav links to Issues, Cycles and Milestones in the populated state", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByRole("link", { name: "Issues" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cycles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Milestones" })).toBeInTheDocument();
  });

  it("points the Cycles quick-nav link at the canonical /cycles route, not the REMOVE-disposition /sprints duplicate", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByRole("link", { name: "Cycles" })).toHaveAttribute(
      "href",
      "/build/101/cycles",
    );
  });

  it("points the Active cycle stat card at the same /cycles route its own data was read from", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useCycles } = jest.requireMock("@/hooks/api/build/advanced");
    (useCycles as jest.Mock).mockReturnValue({
      data: [{ id: 1, name: "Sprint 12", status: "active" }],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Sprint 12").closest("a")).toHaveAttribute(
      "href",
      "/build/101/cycles",
    );
  });

  it("does not render Updates or Files links because the backend has no such endpoints yet", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.queryByRole("link", { name: /updates/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /files/i })).not.toBeInTheDocument();
  });

  it("renders the error state when the resolution reports an error", () => {
    usePageState.mockReturnValue({ kind: "error", error: new Error("Network timeout") });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the active cycle name when one exists", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useCycles } = jest.requireMock("@/hooks/api/build/advanced");
    (useCycles as jest.Mock).mockReturnValue({
      data: [
        { id: 1, name: "Sprint 12", status: "active" },
        { id: 2, name: "Sprint 11", status: "completed" },
      ],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Sprint 12")).toBeInTheDocument();
  });

  it("passes the first erroring query error to usePageState so a 402 plan-upgrade or 403 response is not silently degraded", () => {
    const networkError = new Error("MODULE_NOT_ENABLED");
    const { useProject } = jest.requireMock("@/hooks/api/build/projects");
    (useProject as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: networkError,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: networkError });

    render(<ProjectOverviewPage projectId={101} />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: networkError }),
    );
  });

  it("includes the releases query error in the page error so a failed releases load does not silently degrade to an empty releases card", () => {
    const releasesError = new Error("RELEASES_UNAVAILABLE");
    const { useProject } = jest.requireMock("@/hooks/api/build/projects");
    (useProject as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });
    const { useReleases } = jest.requireMock("@/hooks/api/build/releases");
    (useReleases as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: releasesError,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: releasesError });

    render(<ProjectOverviewPage projectId={101} />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: releasesError }),
    );
  });

  it("renders the loading skeleton and not content when the resolution is loading so the page does not flash an empty state while queries are in flight", () => {
    usePageState.mockReturnValue({ kind: "loading" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.queryByText("Open issues")).not.toBeInTheDocument();
    expect(screen.queryByText("Active cycle")).not.toBeInTheDocument();
  });

  it("renders the empty state for a project that is not found, not the stat cards, so a deleted project does not look like a zero-issues project", () => {
    usePageState.mockReturnValue({ kind: "empty" });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText(/project not found/i)).toBeInTheDocument();
    expect(screen.queryByText("Open issues")).not.toBeInTheDocument();
  });

  it("renders the next-milestone card name and section heading when a pending milestone exists, so the upcoming commitment is visible without navigating to /milestones", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectMilestones } = jest.requireMock("@/hooks/api/build/milestones");
    (useProjectMilestones as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "Beta Release", targetDate: "2026-12-01", status: "PENDING" },
          { id: 2, name: "GA Launch", targetDate: "2027-03-01", status: "PENDING" },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Next milestone")).toBeInTheDocument();
    expect(screen.getByText("Beta Release")).toBeInTheDocument();
    expect(screen.queryByText("GA Launch")).not.toBeInTheDocument();
  });

  it("renders the next-release card name and version when a draft release exists, so the upcoming shipment is visible without navigating to releases", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useReleases } = jest.requireMock("@/hooks/api/build/releases");
    (useReleases as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "v2.0 beta", version: "2.0.0-beta", status: "draft", releaseDate: "2026-11-15", ticketCount: 12, projectId: 101, description: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
          { id: 2, name: "v2.1", version: "2.1.0", status: "draft", releaseDate: "2027-01-10", ticketCount: 5, projectId: 101, description: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Next release")).toBeInTheDocument();
    expect(screen.getByText("v2.0 beta")).toBeInTheDocument();
    expect(screen.queryByText("v2.1")).not.toBeInTheDocument();
  });

  it("does not render the next-release card when all releases are already shipped so the card does not appear with stale data", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useReleases } = jest.requireMock("@/hooks/api/build/releases");
    (useReleases as jest.Mock).mockReturnValue({
      data: {
        data: [
          { id: 1, name: "v1.0", version: "1.0.0", status: "released", releaseDate: "2026-06-01", ticketCount: 8, projectId: 101, description: null, createdAt: "2026-01-01", updatedAt: "2026-01-01" },
        ],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.queryByText("Next release")).not.toBeInTheDocument();
  });

  it("shows the offline banner when the user has no network connection so stale data is not silently mistaken for live data", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useOnlineStatus } = jest.requireMock("@/hooks/common/use-online-status");
    (useOnlineStatus as jest.Mock).mockReturnValue(false);

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
  });

  it("does not show the offline banner when the user is online so normal connectivity does not add noise", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useOnlineStatus } = jest.requireMock("@/hooks/common/use-online-status");
    (useOnlineStatus as jest.Mock).mockReturnValue(true);

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.queryByText(/you're offline/i)).not.toBeInTheDocument();
  });

  it("passes range URL param to useProjectAnalytics so the backend filters analytics by the requested time window", () => {
    mockSearchParams = new URLSearchParams("range=7d");
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");

    render(<ProjectOverviewPage projectId={101} />);

    expect(useProjectAnalytics).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ range: "7d" }),
    );
  });

  it("passes teamId URL param to useProjectAnalytics as a number so team-scoped analytics are not broken by a string cast", () => {
    mockSearchParams = new URLSearchParams("teamId=5");
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");

    render(<ProjectOverviewPage projectId={101} />);

    expect(useProjectAnalytics).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ teamId: 5 }),
    );
  });

  it("passes ownerId URL param to useProjectAnalytics so owner-scoped analytics load correctly", () => {
    mockSearchParams = new URLSearchParams("ownerId=user-abc");
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");

    render(<ProjectOverviewPage projectId={101} />);

    expect(useProjectAnalytics).toHaveBeenCalledWith(
      101,
      expect.objectContaining({ ownerId: "user-abc" }),
    );
  });

  it("passes undefined params to useProjectAnalytics when no URL params are set so the unfiltered analytics query key is stable", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");

    render(<ProjectOverviewPage projectId={101} />);

    expect(useProjectAnalytics).toHaveBeenCalledWith(101, undefined);
  });

  it("ignores an invalid range URL param so a typo does not break the analytics query", () => {
    mockSearchParams = new URLSearchParams("range=invalid");
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectAnalytics } = jest.requireMock("@/hooks/api/build/advanced");

    render(<ProjectOverviewPage projectId={101} />);

    expect(useProjectAnalytics).toHaveBeenCalledWith(101, undefined);
  });

  it("renders no element with a positive tabIndex so document Tab order is not broken", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { container } = render(<ProjectOverviewPage projectId={101} />);

    const positiveTabIndexElements = container.querySelectorAll("[tabindex]");
    positiveTabIndexElements.forEach((el) => {
      const tabIndex = parseInt(el.getAttribute("tabindex") ?? "0", 10);
      expect(tabIndex).toBeLessThanOrEqual(0);
    });
  });

  it("renders the Recent activity section with actor name and ticket key when activity exists", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectActivity } = jest.requireMock(
      "@/hooks/api/build/project-activity",
    );
    (useProjectActivity as jest.Mock).mockReturnValue({
      data: {
        data: [
          {
            id: 500,
            action: "status_changed",
            label: "changed status",
            fromValue: "TODO",
            toValue: "IN_PROGRESS",
            createdAt: "2026-09-01T10:00:00Z",
            ticketId: 42,
            ticketTitle: "Fix authentication bug",
            ticketNumber: 7,
            projectKey: "APP",
            user: { id: "user-1", name: "Alice Smith", image: null },
          },
        ],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("Recent activity")).toBeInTheDocument();
    expect(screen.getByText("Alice Smith")).toBeInTheDocument();
    expect(screen.getByText("changed status")).toBeInTheDocument();
    expect(screen.getByText("APP-7")).toBeInTheDocument();
  });

  it("does not render the Recent activity section when there are no activity items so an empty card is not shown", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectActivity } = jest.requireMock(
      "@/hooks/api/build/project-activity",
    );
    (useProjectActivity as jest.Mock).mockReturnValue({
      data: {
        data: [],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.queryByText("Recent activity")).not.toBeInTheDocument();
  });

  it("shows System as the actor name for activity events with no user so automated actions do not render a blank name", () => {
    usePageState.mockReturnValue({ kind: "ready" });

    const { useProjectActivity } = jest.requireMock(
      "@/hooks/api/build/project-activity",
    );
    (useProjectActivity as jest.Mock).mockReturnValue({
      data: {
        data: [
          {
            id: 501,
            action: "created",
            label: "created this ticket",
            fromValue: null,
            toValue: null,
            createdAt: "2026-09-01T08:00:00Z",
            ticketId: 43,
            ticketTitle: "Initial setup",
            ticketNumber: 1,
            projectKey: "APP",
            user: null,
          },
        ],
        pagination: { limit: 20, hasMore: false, nextCursor: null },
      },
      isLoading: false,
      isError: false,
      error: undefined,
      refetch: jest.fn(),
    });

    render(<ProjectOverviewPage projectId={101} />);

    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it("includes the activity query error in the page error so a failed activity load does not silently degrade to no feed", () => {
    const activityError = new Error("ACTIVITY_UNAVAILABLE");
    const { useProjectActivity } = jest.requireMock(
      "@/hooks/api/build/project-activity",
    );
    (useProjectActivity as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: activityError,
      refetch: jest.fn(),
    });
    usePageState.mockReturnValue({ kind: "error", error: activityError });

    render(<ProjectOverviewPage projectId={101} />);

    expect(usePageState).toHaveBeenCalledWith(
      expect.objectContaining({ error: activityError }),
    );
  });
});
