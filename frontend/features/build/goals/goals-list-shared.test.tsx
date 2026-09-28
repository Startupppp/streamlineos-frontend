import React from "react";
import { render, screen } from "@testing-library/react";
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
