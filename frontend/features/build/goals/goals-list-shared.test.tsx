import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { GoalCard } from "./goals-list-shared";
import type { GoalListItem } from "@/hooks/api/goals";

jest.mock("@/components/pm-chrome", () => ({
  PM_PANEL: "",
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/progress", () => ({
  Progress: () => <div role="progressbar" />,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text: string }) => <span>{text}</span>,
}));

jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

jest.mock("@animateicons/react/lucide", () => ({
  EllipsisIcon: () => null,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  useReducedMotion: () => false,
}));

jest.mock("@/lib/motion-presets", () => ({
  listItem: {},
  listItemReduced: {},
  pmSnappy: {},
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

jest.mock("@/lib/text-overflow", () => ({ TEXT_TWO_LINES: "" }));

jest.mock("./constants", () => ({
  STATUS_CONFIG: {
    not_started: { variant: "secondary", label: "Not Started" },
    on_track: { variant: "default", label: "On Track" },
    at_risk: { variant: "outline", label: "At Risk" },
    off_track: { variant: "destructive", label: "Off Track" },
    completed: { variant: "default", label: "Completed" },
  },
  STATUS_OPTIONS: [
    { value: "not_started", label: "Not Started" },
    { value: "on_track", label: "On Track" },
    { value: "at_risk", label: "At Risk" },
    { value: "off_track", label: "Off Track" },
    { value: "completed", label: "Completed" },
  ],
  LEVEL_OPTIONS: [
    { value: "company", label: "Company" },
    { value: "team", label: "Team" },
    { value: "individual", label: "Individual" },
  ],
  LEVEL_LABEL: { company: "Company", team: "Team", individual: "Individual" },
}));

function baseGoal(overrides: Partial<GoalListItem> = {}): GoalListItem {
  return {
    id: 1,
    orgId: "org-1",
    title: "Alpha Goal",
    description: null,
    ownerMembershipId: null,
    level: "company",
    status: "on_track",
    progress: 50,
    confidence: null,
    version: 1,
    startDate: null,
    dueDate: null,
    parentGoalId: null,
    projectId: null,
    createdByMembershipId: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    deletedAt: null,
    target: null,
    current: null,
    owner: null,
    keyResultCount: 0,
    linkCount: 0,
    linkedTicketCount: 0,
    linkedProjectCount: 0,
    productLinkage: null,
    linkedRoadmapItemCount: 0,
    linkedOpportunityCount: 0,
    outcomeReviews: null,
    lastCheckInAt: null,
    checkInFreshness: "none",
    ...overrides,
  };
}

describe("GoalCard renders target, current, and confidence when present (Task A)", () => {
  it("shows KR total row with target and current when target is not null", () => {
    render(<GoalCard goal={baseGoal({ target: "100.00", current: "47.50" })} />);
    expect(screen.getByText("KR total")).toBeInTheDocument();
    expect(screen.getByText("47.50 / 100.00")).toBeInTheDocument();
  });

  it("shows confidence when not null", () => {
    render(<GoalCard goal={baseGoal({ confidence: 75 })} />);
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("renders current as 0 not null when target is set but current is null — graceful null degradation", () => {
    render(<GoalCard goal={baseGoal({ target: "100.00", current: null })} />);
    expect(screen.getByText("0 / 100.00")).toBeInTheDocument();
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("does not render the KR total row when both target and current are null", () => {
    render(<GoalCard goal={baseGoal({ target: null, current: null })} />);
    expect(screen.queryByText("KR total")).not.toBeInTheDocument();
  });

  it("does not render the confidence row when confidence is null", () => {
    render(<GoalCard goal={baseGoal({ confidence: null })} />);
    expect(screen.queryByText("Confidence")).not.toBeInTheDocument();
  });

  it("does not render the string literal null anywhere in the goal card for null fields", () => {
    render(<GoalCard goal={baseGoal({ target: null, current: null, confidence: null })} />);
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });

  it("renders all three fields together when all are present", () => {
    render(
      <GoalCard
        goal={baseGoal({ target: "200.00", current: "80.00", confidence: 60 })}
      />,
    );
    expect(screen.getByText("KR total")).toBeInTheDocument();
    expect(screen.getByText("80.00 / 200.00")).toBeInTheDocument();
    expect(screen.getByText("Confidence")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});

describe("GoalCard renders the linked-initiative count (BSN-GOALS-LINKS)", () => {
  it("names the linked projects and tickets so the success metric is visible on the card", () => {
    render(
      <GoalCard
        goal={baseGoal({ linkCount: 3, linkedProjectCount: 1, linkedTicketCount: 2 })}
      />,
    );
    expect(screen.getByText("3 linked (1 project, 2 tickets)")).toBeInTheDocument();
  });

  it("pluralises a single ticket and multiple projects", () => {
    render(
      <GoalCard
        goal={baseGoal({ linkCount: 3, linkedProjectCount: 2, linkedTicketCount: 1 })}
      />,
    );
    expect(screen.getByText("3 linked (2 projects, 1 ticket)")).toBeInTheDocument();
  });

  it("says no linked initiatives rather than rendering a bare zero", () => {
    render(<GoalCard goal={baseGoal()} />);
    expect(screen.getByText("No linked initiatives")).toBeInTheDocument();
    expect(screen.queryByText(/0 linked/)).not.toBeInTheDocument();
  });
});

describe("GoalCard right-click mirrors the row menu (BSN-GOALS-CONTEXT)", () => {
  it("opens the same edit and delete commands on right-click, so the menu is not the only path and the only path is not a hover target", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const { container } = render(
      <GoalCard goal={baseGoal()} onEdit={onEdit} onDelete={onDelete} />,
    );
    fireEvent.contextMenu(container.firstElementChild!);
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("offers no right-click menu to a viewer with neither command (FE-122 paired negative)", () => {
    const { container } = render(<GoalCard goal={baseGoal()} />);
    fireEvent.contextMenu(container.firstElementChild!);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });
});

describe("GoalCard visual identity and actions", () => {
  it("keeps the objective level on the card after the product list removes group headings", () => {
    render(<GoalCard goal={baseGoal({ level: "team", title: "Ship onboarding" })} />);
    expect(screen.getByText("Team objective")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ship onboarding" })).toHaveAttribute("href", "/build/goals/1");
  });

  it("pairs both menu actions with icons while retaining readable labels", () => {
    render(<GoalCard goal={baseGoal()} onEdit={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Edit" }).querySelector("svg")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" }).querySelector("svg")).toBeInTheDocument();
  });
});

describe("GoalCard — check-in freshness badge (BSN-GOALS-FRESHNESS)", () => {
  it("shows a fresh badge when checkInFreshness is fresh", () => {
    render(<GoalCard goal={baseGoal({ checkInFreshness: "fresh" })} />);
    expect(screen.getByTitle("Check-in: Fresh")).toBeInTheDocument();
  });

  it("shows a stale badge when checkInFreshness is stale", () => {
    render(<GoalCard goal={baseGoal({ checkInFreshness: "stale" })} />);
    expect(screen.getByTitle("Check-in: Stale check-in")).toBeInTheDocument();
  });

  it("shows no freshness badge when checkInFreshness is none (FE-122 negative pair)", () => {
    render(<GoalCard goal={baseGoal({ checkInFreshness: "none" })} />);
    expect(screen.queryByTitle(/Check-in:/)).not.toBeInTheDocument();
  });
});

describe("GoalCard — unlink from product action (BSN-GOALS-UNLINK)", () => {
  it("shows the Unlink from product menu item when onUnlink is provided", () => {
    const onUnlink = jest.fn();
    render(<GoalCard goal={baseGoal()} onUnlink={onUnlink} />);
    expect(screen.getByRole("button", { name: /Unlink from product/i })).toBeInTheDocument();
  });

  it("does not show the Unlink menu item when onUnlink is absent (FE-122 negative pair)", () => {
    render(<GoalCard goal={baseGoal()} />);
    expect(screen.queryByRole("button", { name: /Unlink from product/i })).not.toBeInTheDocument();
  });

  it("calls onUnlink with the goal when Unlink from product is clicked", () => {
    const onUnlink = jest.fn();
    const goal = baseGoal({ id: 42 });
    render(<GoalCard goal={goal} onUnlink={onUnlink} />);
    fireEvent.click(screen.getByRole("button", { name: /Unlink from product/i }));
    expect(onUnlink).toHaveBeenCalledWith(goal);
  });
});

describe("GoalCard — check in from card (BSN-GOALS-CHECKIN-CARD)", () => {
  it("shows the Check in menu item when onCheckIn is provided and goal has key results", () => {
    const onCheckIn = jest.fn();
    render(<GoalCard goal={baseGoal({ keyResultCount: 1 })} onCheckIn={onCheckIn} />);
    expect(screen.getByRole("button", { name: /Check in/i })).toBeInTheDocument();
  });

  it("does not show Check in when keyResultCount is 0 even if onCheckIn is provided", () => {
    const onCheckIn = jest.fn();
    render(<GoalCard goal={baseGoal({ keyResultCount: 0 })} onCheckIn={onCheckIn} />);
    expect(screen.queryByRole("button", { name: /Check in/i })).not.toBeInTheDocument();
  });

  it("calls onCheckIn with the goal when Check in is clicked", () => {
    const onCheckIn = jest.fn();
    const goal = baseGoal({ id: 99, keyResultCount: 2 });
    render(<GoalCard goal={goal} onCheckIn={onCheckIn} />);
    fireEvent.click(screen.getByRole("button", { name: /Check in/i }));
    expect(onCheckIn).toHaveBeenCalledWith(goal);
  });
});

describe("GoalCard — parent goal and measurement source (Task 8)", () => {
  it("shows a parent goal link when parentGoalId is set", () => {
    render(<GoalCard goal={baseGoal({ id: 5, parentGoalId: 2 })} />);
    const link = screen.getByRole("link", { name: "Parent goal" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/build/goals/2");
  });

  it("does not show parent goal link when parentGoalId is null (FE-122 negative pair)", () => {
    render(<GoalCard goal={baseGoal({ parentGoalId: null })} />);
    expect(screen.queryByRole("link", { name: "Parent goal" })).not.toBeInTheDocument();
  });

  it("renders outcome reviews as a drill-down link to the goal detail page", () => {
    const goal = baseGoal({
      id: 7,
      outcomeReviews: { completed: 2, scheduled: 4, latestResult: "on_track" },
    });
    render(<GoalCard goal={goal} />);
    const link = screen.getByRole("link", { name: /Outcome reviews/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/build/goals/7");
  });

  it("does not render the outcome reviews link when outcomeReviews is null (FE-122 negative pair)", () => {
    render(<GoalCard goal={baseGoal({ id: 7, outcomeReviews: null })} />);
    expect(screen.queryByText(/Outcome reviews/)).not.toBeInTheDocument();
  });
});
