import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/epics", () => ({
  useEpics: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useManagedProductReleases: jest.fn(() => ({ data: undefined })),
}));

import { OpportunityAcceptDialog } from "./opportunity-accept-dialog";
import { useGoals } from "@/hooks/api/goals";
import { useEpics } from "@/hooks/api/build/epics";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { useManagedProductProjects } from "@/hooks/api/build/managed-product-projects";
import { useManagedProductReleases } from "@/hooks/api/build/managed-product-releases";

const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseEpics = useEpics as jest.MockedFunction<typeof useEpics>;
const mockUseRoadmapItems = useRoadmapItems as jest.MockedFunction<typeof useRoadmapItems>;
const mockUseProjects = useManagedProductProjects as jest.MockedFunction<
  typeof useManagedProductProjects
>;
const mockUseReleases = useManagedProductReleases as jest.MockedFunction<
  typeof useManagedProductReleases
>;

function withProjects(projects: Array<{ id: number; name: string }>) {
  mockUseProjects.mockReturnValue({
    data: { data: projects, pagination: { limit: 100, hasMore: false, nextCursor: null } },
  } as unknown as ReturnType<typeof useManagedProductProjects>);
}

const noop = jest.fn();

const BASE_PROPS = {
  open: true as const,
  onOpenChange: noop,
  opportunityTitle: "Mobile onboarding friction",
  expectedVersion: 2,
  managedProductId: 5,
  isSubmitting: false,
  onAccept: noop,
};

describe("OpportunityAcceptDialog — form submission (BSN-ACCEPT-DIALOG)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProjects.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useManagedProductProjects
    >);
    mockUseReleases.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useManagedProductReleases
    >);
    mockUseEpics.mockReturnValue({ data: [] } as unknown as ReturnType<typeof useEpics>);
  });

  it("calls onAccept with the default horizon 'next' and expectedVersion when submitted without changes so a roadmap item is created at the expected version", async () => {
    const handleAccept = jest.fn();
    render(
      <OpportunityAcceptDialog
        {...BASE_PROPS}
        onAccept={handleAccept}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));

    await waitFor(() => {
      expect(handleAccept).toHaveBeenCalledWith(
        expect.objectContaining({
          horizon: "next",
          expectedVersion: 2,
        }),
        expect.any(Object),
      );
    });
  });

  it("loads the product's linked projects so the user can link the roadmap item to a project", () => {
    withProjects([
      { id: 42, name: "Platform Q3" },
      { id: 99, name: "Growth H2" },
    ]);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(mockUseProjects).toHaveBeenCalledWith({ managedProductId: 5, limit: 100 });
    expect(screen.getByRole("combobox", { name: "Project (optional)" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Horizon" })).toBeInTheDocument();
  });

  it("does not render the project select when the product has no linked projects so the form stays minimal", () => {
    withProjects([]);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByTestId("project-select")).not.toBeInTheDocument();
  });

  it("loads the product's releases so the user can target a release", () => {
    mockUseReleases.mockReturnValue({
      data: {
        data: [{ id: 3, name: "Spring", version: "2.0" }],
        hasMore: false,
        nextCursor: null,
      },
    } as unknown as ReturnType<typeof useManagedProductReleases>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(mockUseReleases).toHaveBeenCalledWith(5, { enabled: true });
    expect(screen.getByTestId("release-select")).toBeInTheDocument();
  });

  it("renders the goal select when goals are returned from the hook so the user can link to an OKR goal", () => {
    mockUseGoals.mockReturnValueOnce({
      data: [
        { id: 10, title: "Increase NPS", status: "on_track", level: "company", progress: 0, keyResults: [] },
        { id: 11, title: "Reduce churn", status: "on_track", level: "company", progress: 0, keyResults: [] },
      ],
    } as unknown as ReturnType<typeof useGoals>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByTestId("goal-select")).toBeInTheDocument();
    expect(screen.getByText("Increase NPS")).toBeInTheDocument();
  });

  it("does not render the goal select when no goals are available so the form stays minimal", () => {
    mockUseGoals.mockReturnValueOnce({ data: [] } as unknown as ReturnType<typeof useGoals>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByTestId("goal-select")).not.toBeInTheDocument();
  });

  it("renders the is-public toggle always so the user can set customer visibility", () => {
    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByTestId("is-public-switch")).toBeInTheDocument();
  });

  it("renders the depends-on list when roadmap items are returned so the user can add dependencies", () => {
    mockUseRoadmapItems.mockReturnValueOnce({
      data: {
        data: [
          { id: 1, title: "Auth overhaul" },
          { id: 2, title: "Billing redesign" },
        ],
        hasMore: false,
        nextCursor: null,
      },
    } as unknown as ReturnType<typeof useRoadmapItems>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByTestId("depends-on-list")).toBeInTheDocument();
    expect(screen.getByText("Auth overhaul")).toBeInTheDocument();
    expect(screen.getByText("Billing redesign")).toBeInTheDocument();
  });

  it("does not render the depends-on list when no roadmap items exist so the form stays minimal", () => {
    mockUseRoadmapItems.mockReturnValueOnce({
      data: undefined,
    } as unknown as ReturnType<typeof useRoadmapItems>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByTestId("depends-on-list")).not.toBeInTheDocument();
  });

  it("does not show the epic select when no project is selected even if epics exist so epicTicketId cannot be set without a project", () => {
    mockUseEpics.mockReturnValue({
      data: [{ id: 7, title: "Epic A", type: "EPIC", status: "Todo", priority: "MEDIUM", projectId: 42, ticketNumber: 1, orgId: "org-1", health: null, cycleId: null, epicId: null, assigneeMembershipId: null, points: null, storyPoints: null, startDate: null, dueDate: null, estimate: null, completionPercentage: null, assignee: null, description: null }],
    } as unknown as ReturnType<typeof useEpics>);
    withProjects([{ id: 42, name: "Platform Q3" }]);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByTestId("epic-select")).not.toBeInTheDocument();
  });
});
