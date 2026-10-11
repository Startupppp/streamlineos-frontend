import { render, screen } from "@testing-library/react";
import { OpportunityTrace } from "./opportunity-trace";
import type { DiscoveryGetTraceResponse } from "@/contracts/build-contracts.generated";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

const BASE_OPPORTUNITY: DiscoveryGetTraceResponse["opportunity"] = {
  id: 7,
  title: "Automate invoice matching",
  problem: null,
  hypothesis: null,
  affectedSegment: null,
  theme: null,
  owner: null,
  state: "delivered",
  desiredOutcome: null,
  outcomeMetric: null,
  outcomeUnit: null,
  outcomeBaseline: null,
  outcomeTarget: null,
  goalId: null,
  roadmapItemId: 55,
  evidence: { count: 9, latestAt: null },
  latestScore: null,
  scoreStatus: "unscored",
  version: 2,
  updatedAt: "2026-09-01T00:00:00Z",
  allowedActions: [],
};

const FULL_TRACE: DiscoveryGetTraceResponse = {
  evidence: [
    { id: 1, sourceKind: "feedbucket_submission", sourceId: 101, addedAt: "2026-09-01T00:00:00Z" },
    { id: 2, sourceKind: "feedbucket_submission", sourceId: 102, addedAt: "2026-09-02T00:00:00Z" },
  ],
  opportunity: BASE_OPPORTUNITY,
  scores: {
    latest: {
      scoreVersion: 1,
      reach: "500",
      reachPeriod: "month",
      reachUnit: null,
      impact: "2",
      confidence: "0.8",
      effort: "10",
      effortUnit: "person_days",
      computedScore: "80.00",
      isOverride: false,
      overrideScore: null,
      overrideReason: null,
      effectiveScore: "80.00",
      createdAt: "2026-09-01T00:00:00Z",
      createdBy: "Alice",
    },
    count: 1,
  },
  decision: {
    opportunityId: 7,
    decidedAt: "2026-09-10T00:00:00Z",
    decidedBy: "Bob",
    note: "Q3 priority",
    scoreVersion: 1,
    score: 80,
    evidenceCount: 9,
  },
  roadmapItem: { id: 55, title: "Invoice automation", horizon: "now", status: "in_progress", projectId: 12, epicTicketId: null, releaseId: null },
  delivery: {
    project: { id: 12, name: "Finance Platform" },
    tickets: { total: 8, done: 6, percent: 75 },
  },
  release: { id: 3, name: "v2.4", version: "2.4.0" },
  outcomeReviews: [
    { id: 10, title: "NPS impact", state: "completed", result: "met", kind: "outcome_review", scheduledFor: null },
  ],
  dependencies: [
    { dependsOnId: 20, title: "Auth refactor", horizon: "now", status: "in_progress" },
    { dependsOnId: 21, title: "DB migration", horizon: "next", status: "planned" },
  ],
};

const MINIMAL_TRACE: DiscoveryGetTraceResponse = {
  evidence: [],
  opportunity: { ...BASE_OPPORTUNITY, state: "identified", roadmapItemId: null },
  scores: { latest: null, count: 0 },
  decision: null,
  roadmapItem: null,
  delivery: { project: null, tickets: null },
  release: null,
  outcomeReviews: [],
  dependencies: [],
};

describe("OpportunityTrace — step rendering (BSN-TRACE-STEPS)", () => {
  it("renders all required trace step testids so each phase of the lifecycle is visually addressable", () => {
    render(<OpportunityTrace managedProductId={1} trace={FULL_TRACE} />);

    expect(screen.getByTestId("opportunity-trace")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-evidence")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-opportunity")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-score")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-decision")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-roadmap")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-delivery")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-release")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-outcome-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-dependencies")).toBeInTheDocument();
  });

  it("shows when the decision was made instead of the raw decider id", () => {
    render(<OpportunityTrace managedProductId={1} trace={FULL_TRACE} />);

    const decision = screen.getByTestId("trace-step-decision");
    expect(decision).toHaveTextContent("on 10 Sept 2026");
    expect(decision).not.toHaveTextContent("Bob");
    expect(decision).toHaveTextContent("Q3 priority");
  });

  it("renders a link to the product roadmap page from the roadmap item so the user can navigate to the roadmap", () => {
    render(<OpportunityTrace managedProductId={99} trace={FULL_TRACE} />);

    const roadmapLink = screen.getByTestId("trace-roadmap-link");
    expect(roadmapLink).toBeInTheDocument();
    expect(roadmapLink).toHaveAttribute("href", expect.stringContaining("99"));
    expect(roadmapLink).toHaveAttribute("href", expect.stringContaining("roadmap"));
  });

  it("renders a link to the delivery project so the user can navigate from the trace to the delivery project", () => {
    render(<OpportunityTrace managedProductId={1} trace={FULL_TRACE} />);

    const projectLink = screen.getByTestId("trace-project-link");
    expect(projectLink).toBeInTheDocument();
    expect(projectLink).toHaveAttribute("href", expect.stringContaining("12"));
  });

  it("still renders core step containers when data is minimal so the UI is stable without optional fields", () => {
    render(<OpportunityTrace managedProductId={1} trace={MINIMAL_TRACE} />);

    expect(screen.getByTestId("opportunity-trace")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-evidence")).toBeInTheDocument();
    expect(screen.getByTestId("trace-step-opportunity")).toBeInTheDocument();
    expect(screen.queryByTestId("trace-step-roadmap")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trace-step-delivery")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trace-step-release")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trace-step-outcome-reviews")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trace-step-dependencies")).not.toBeInTheDocument();
  });
});

describe("OpportunityTrace — dependencies (BSN-TRACE-DEPS)", () => {
  it("renders the dependencies step when the trace has dependency items so blockers are visible in the lifecycle", () => {
    render(<OpportunityTrace managedProductId={1} trace={FULL_TRACE} />);

    const depsStep = screen.getByTestId("trace-step-dependencies");
    expect(depsStep).toBeInTheDocument();
    expect(depsStep).toHaveTextContent("Auth refactor");
    expect(depsStep).toHaveTextContent("DB migration");
  });

  it("does not render the dependencies step when the dependencies array is empty so the trace stays uncluttered", () => {
    render(<OpportunityTrace managedProductId={1} trace={MINIMAL_TRACE} />);

    expect(screen.queryByTestId("trace-step-dependencies")).not.toBeInTheDocument();
  });
});
