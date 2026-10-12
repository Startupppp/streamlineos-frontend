import { render, screen } from "@testing-library/react";
import { ProductGoalsViewBody } from "./product-goals-view-body";
import type { GoalListItem } from "@/hooks/api/goals";

jest.mock("@/features/build/goals/goals-list-shared", () => ({
  GoalCard: ({ goal }: { goal: GoalListItem }) => <div data-testid="goal-card">{goal.title}</div>,
  GOAL_LEVEL_ORDER: ["company", "team", "individual"],
}));

jest.mock("@/features/build/goals/constants", () => ({
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
}));

jest.mock("./product-goals-table-view", () => ({
  ProductGoalsTableView: ({ goals }: { goals: GoalListItem[] }) => (
    <table data-testid="goals-data-table">
      <tbody>
        {goals.map((g) => (
          <tr key={g.id}><td>{g.title}</td></tr>
        ))}
      </tbody>
    </table>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function makeGoal(overrides: { id: number; title: string; level: string }): GoalListItem {
  return {
    id: overrides.id,
    title: overrides.title,
    level: overrides.level,
    status: "on_track",
    progress: 50,
    keyResultCount: 0,
    linkCount: 0,
    linkedTicketCount: 0,
    linkedProjectCount: 0,
    linkedRoadmapItemCount: 0,
    linkedOpportunityCount: 0,
    productLinkage: null,
    owner: null,
    outcomeReviews: null,
    lastCheckInAt: null,
    checkInFreshness: "none",
    orgId: "org-1",
    description: null,
    ownerMembershipId: null,
    confidence: null,
    version: 1,
    startDate: null,
    dueDate: null,
    parentGoalId: null,
    projectId: null,
    createdByMembershipId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
    target: null,
    current: null,
    allowedActions: [],
  } as GoalListItem;
}

const GOALS: GoalListItem[] = [
  makeGoal({ id: 1, title: "Alpha", level: "company" }),
  makeGoal({ id: 2, title: "Beta", level: "team" }),
];

const BASE_PROPS = {
  flatGoals: GOALS,
  totalGoals: GOALS.length,
  canManage: true,
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onUnlink: jest.fn(),
  onCheckIn: jest.fn(),
  onRowClick: jest.fn(),
};

describe("ProductGoalsViewBody", () => {
  it("renders a DataTable in table mode", () => {
    render(<ProductGoalsViewBody {...BASE_PROPS} viewMode="table" />);
    expect(screen.getByTestId("goals-data-table")).toBeInTheDocument();
    expect(screen.queryByTestId("goal-card")).not.toBeInTheDocument();
  });

  it("renders a flat list with count in list mode", () => {
    render(<ProductGoalsViewBody {...BASE_PROPS} viewMode="list" />);
    expect(screen.getByText(/goals linked to this product/)).toBeInTheDocument();
    expect(screen.getAllByTestId("goal-card")).toHaveLength(2);
    expect(screen.queryByTestId("goals-data-table")).not.toBeInTheDocument();
  });

  it("renders goals grouped by level with section headers in tree mode", () => {
    render(<ProductGoalsViewBody {...BASE_PROPS} viewMode="tree" />);
    expect(screen.getByRole("heading", { name: "Company" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Individual" })).not.toBeInTheDocument();
    expect(screen.getAllByTestId("goal-card")).toHaveLength(2);
    expect(screen.queryByTestId("goals-data-table")).not.toBeInTheDocument();
  });

  it("shows singular text for exactly one goal in list mode", () => {
    render(<ProductGoalsViewBody {...BASE_PROPS} flatGoals={[GOALS[0]]} totalGoals={1} viewMode="list" />);
    expect(screen.getByText(/goal linked to this product/)).toBeInTheDocument();
  });
});
