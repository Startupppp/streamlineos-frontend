import { render, screen } from "@testing-library/react";
import type { AutomationRunRow } from "@/hooks/api/build/automation-analysis-schema";

let canManageReturn = true;
let replayMutate: jest.Mock;
let replayIsPending = false;
let replayVariables: number | undefined;
let mockRuns: AutomationRunRow[] = [];

jest.mock("@/hooks/api/access", () => ({
  useCan: () => canManageReturn,
}));

jest.mock("@/hooks/api/build/automations", () => ({
  useAutomationRuns: () => ({
    data: { pages: [{ items: mockRuns, pagination: { limit: 25, hasMore: false, nextCursor: null } }] },
    isLoading: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
  useReplayAutomationRun: () => ({
    mutate: replayMutate,
    isPending: replayIsPending,
    variables: replayVariables,
  }),
}));

jest.mock("@/components/ui/infinite-scroll-sentinel", () => ({
  InfiniteScrollSentinel: () => null,
}));

import { AutomationRunHistory } from "./automation-run-history";

function makeRun(
  id: number,
  outcome: AutomationRunRow["outcome"],
): AutomationRunRow {
  return {
    id,
    orgId: "org-1",
    projectId: 10,
    automationId: 42,
    ticketId: null,
    triggerEvent: "ticket.created",
    matched: outcome !== "not_matched",
    outcome,
    errorMessage: null,
    createdAt: "2026-10-01T10:00:00.000Z",
    actions: [],
  };
}

beforeEach(() => {
  canManageReturn = true;
  replayMutate = jest.fn();
  replayIsPending = false;
  replayVariables = undefined;
  mockRuns = [];
});

describe("AutomationRunHistory replay button visibility", () => {
  it("shows replay button for matched_failed outcome when user can manage", () => {
    mockRuns = [makeRun(1, "matched_failed")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.getByRole("button", { name: "Replay this run" })).toBeInTheDocument();
  });

  it("shows replay button for matched_partial_failure outcome when user can manage", () => {
    mockRuns = [makeRun(2, "matched_partial_failure")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.getByRole("button", { name: "Replay this run" })).toBeInTheDocument();
  });

  it("shows replay button for error outcome when user can manage", () => {
    mockRuns = [makeRun(3, "error")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.getByRole("button", { name: "Replay this run" })).toBeInTheDocument();
  });

  it("does not show replay button for matched_success outcome", () => {
    mockRuns = [makeRun(4, "matched_success")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.queryByRole("button", { name: "Replay this run" })).not.toBeInTheDocument();
  });

  it("does not show replay button for not_matched outcome", () => {
    mockRuns = [makeRun(5, "not_matched")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.queryByRole("button", { name: "Replay this run" })).not.toBeInTheDocument();
  });

  it("does not show replay button when user cannot manage even for failed outcome", () => {
    canManageReturn = false;
    mockRuns = [makeRun(6, "matched_failed")];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.queryByRole("button", { name: "Replay this run" })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no runs", () => {
    mockRuns = [];
    render(<AutomationRunHistory projectId={10} automationId={42} />);
    expect(screen.getByText("No runs recorded yet.")).toBeInTheDocument();
  });
});
