import { render, screen } from "@testing-library/react";
import { ProjectOverviewPage } from "./project-overview-page";

const usePageState = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/101",
  useSearchParams: () => new URLSearchParams(),
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

beforeEach(() => {
  jest.clearAllMocks();
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
});
