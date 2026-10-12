import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("@/hooks/api/goals", () => ({
  useGoals: jest.fn(() => ({ data: [], isError: false, error: null, refetch: jest.fn() })),
}));

jest.mock("@/hooks/api/build/epics", () => ({
  useEpics: jest.fn(() => ({ data: [] })),
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useInfiniteManagedProductReleases: jest.fn(() => ({
    data: undefined,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
}));

jest.mock("../use-infinite-selector", () => ({
  useInfiniteSelectorProjects: jest.fn(() => ({
    data: undefined,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useInfiniteSelectorRoadmapItems: jest.fn(() => ({
    data: undefined,
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
}));

import { OpportunityAcceptDialog } from "./opportunity-accept-dialog";
import { useGoals } from "@/hooks/api/goals";
import { useEpics } from "@/hooks/api/build/epics";
import { useInfiniteManagedProductReleases } from "@/hooks/api/build/managed-product-releases";
import { useInfiniteSelectorProjects, useInfiniteSelectorRoadmapItems } from "../use-infinite-selector";

const mockUseGoals = useGoals as jest.MockedFunction<typeof useGoals>;
const mockUseEpics = useEpics as jest.MockedFunction<typeof useEpics>;
const mockUseInfiniteReleases = useInfiniteManagedProductReleases as jest.MockedFunction<
  typeof useInfiniteManagedProductReleases
>;
const mockUseInfiniteProjects = useInfiniteSelectorProjects as jest.MockedFunction<
  typeof useInfiniteSelectorProjects
>;
const mockUseInfiniteRoadmap = useInfiniteSelectorRoadmapItems as jest.MockedFunction<
  typeof useInfiniteSelectorRoadmapItems
>;

function withProjects(projects: Array<{ id: number; name: string }>) {
  mockUseInfiniteProjects.mockReturnValue({
    data: { pages: [{ data: projects, pagination: { hasMore: false, nextCursor: null } }] },
    isError: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  } as unknown as ReturnType<typeof useInfiniteSelectorProjects>);
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
    mockUseInfiniteProjects.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteSelectorProjects>);
    mockUseInfiniteReleases.mockReturnValue({
      data: undefined,
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteManagedProductReleases>);
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

    expect(mockUseInfiniteProjects).toHaveBeenCalledWith(5, expect.any(String), true);
    expect(screen.getByRole("combobox", { name: "Project (optional)" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Horizon" })).toBeInTheDocument();
  });

  it("does not render the project selector when the product has no linked projects so the form stays minimal", () => {
    withProjects([]);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByRole("combobox", { name: "Project (optional)" })).not.toBeInTheDocument();
  });

  it("loads the product's releases so the user can target a release", () => {
    mockUseInfiniteReleases.mockReturnValue({
      data: {
        pages: [{ data: [{ id: 3, name: "Spring", version: "2.0" }] }],
      },
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteManagedProductReleases>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(mockUseInfiniteReleases).toHaveBeenCalledWith(5, { limit: 25 });
    expect(screen.getByTestId("release-select")).toBeInTheDocument();
  });

  it("renders the goal combobox when goals are returned from the hook so the user can link to an OKR goal", () => {
    mockUseGoals.mockReturnValueOnce({
      data: [
        { id: 10, title: "Increase NPS", status: "on_track", level: "company", progress: 0, keyResults: [] },
        { id: 11, title: "Reduce churn", status: "on_track", level: "company", progress: 0, keyResults: [] },
      ],
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByRole("combobox", { name: "Goal (optional)" })).toBeInTheDocument();
  });

  it("does not render the goal selector when no goals are available so the form stays minimal", () => {
    mockUseGoals.mockReturnValueOnce({
      data: [],
      isError: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useGoals>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.queryByRole("combobox", { name: "Goal (optional)" })).not.toBeInTheDocument();
  });

  it("renders the is-public toggle always so the user can set customer visibility", () => {
    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByTestId("is-public-switch")).toBeInTheDocument();
  });

  it("renders the depends-on list when roadmap items are returned so the user can add dependencies", () => {
    mockUseInfiniteRoadmap.mockReturnValueOnce({
      data: {
        pages: [
          {
            data: [
              { id: 1, title: "Auth overhaul" },
              { id: 2, title: "Billing redesign" },
            ],
            pagination: { hasMore: false, nextCursor: null },
          },
        ],
      },
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteSelectorRoadmapItems>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByTestId("depends-on-list")).toBeInTheDocument();
    expect(screen.getByText("Auth overhaul")).toBeInTheDocument();
    expect(screen.getByText("Billing redesign")).toBeInTheDocument();
  });

  it("does not render the depends-on list when no roadmap items exist so the form stays minimal", () => {
    mockUseInfiniteRoadmap.mockReturnValueOnce({
      data: undefined,
      isError: false,
      error: null,
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteSelectorRoadmapItems>);

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

  it("shows an error state for projects and keeps the dialog open so the user can retry without losing context", () => {
    mockUseInfiniteProjects.mockReturnValue({
      data: undefined,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteSelectorProjects>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
  });

  it("shows an error state for releases and keeps the dialog open so the user can retry without losing context", () => {
    mockUseInfiniteReleases.mockReturnValue({
      data: undefined,
      isError: true,
      error: new Error("Network error"),
      refetch: jest.fn(),
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    } as unknown as ReturnType<typeof useInfiniteManagedProductReleases>);

    render(<OpportunityAcceptDialog {...BASE_PROPS} />);

    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
  });
});
