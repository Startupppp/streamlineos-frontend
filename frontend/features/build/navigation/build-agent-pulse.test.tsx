import { render, screen } from "@testing-library/react";
import { BuildAgentPulse } from "./build-agent-pulse";
import type { AgentPulseSignal } from "@/hooks/api/build/agent-pulse-schema";

jest.mock("@/hooks/api/build/agent-pulse", () => ({
  useAgentPulse: jest.fn(),
}));

jest.mock("@/lib/build/build-scope", () => ({
  BUILD_ROOT_PATH: "/build",
  resolveBuildScope: jest.fn().mockReturnValue({
    type: "organization",
    managedProductId: null,
    projectId: null,
    basePath: "/build",
  }),
  buildScopeKey: jest.fn().mockReturnValue("organization"),
}));

jest.mock("next/navigation", () => ({
  usePathname: jest.fn().mockReturnValue("/build"),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip-content">{children}</div>,
}));

import { useAgentPulse } from "@/hooks/api/build/agent-pulse";

const mockUseAgentPulse = useAgentPulse as jest.Mock;

function makeSignal(overrides: Partial<AgentPulseSignal> = {}): AgentPulseSignal {
  return {
    type: "overdue_approval",
    entityId: 1,
    projectId: 10,
    title: "Budget approval",
    dueAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("BuildAgentPulse", () => {
  beforeEach(() => jest.resetAllMocks());

  it("renders nothing when there is no signal — empty state is quiet", () => {
    mockUseAgentPulse.mockReturnValue({ data: null });
    const { container } = render(
      <BuildAgentPulse isCollapsed={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when data is undefined", () => {
    mockUseAgentPulse.mockReturnValue({ data: undefined });
    const { container } = render(
      <BuildAgentPulse isCollapsed={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders overdue_approval signal with correct href and summary", () => {
    mockUseAgentPulse.mockReturnValue({ data: makeSignal() });
    render(<BuildAgentPulse isCollapsed={false} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/build/approvals");
    expect(link).toHaveAttribute("aria-label", "Overdue approval: Budget approval");
    expect(screen.getByText("Overdue approval: Budget approval")).toBeInTheDocument();
  });

  it("renders blocked_milestone with project-scoped href", () => {
    const signal = makeSignal({ type: "blocked_milestone", projectId: 20, title: "v2.0 release" });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/build/20/milestones");
  });

  it("renders delivery_risk with project risks href", () => {
    const signal = makeSignal({ type: "delivery_risk", projectId: 30, title: "Auth outage risk" });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/build/30/risks");
  });

  it("renders dependency_change linking to project board", () => {
    const signal = makeSignal({ type: "dependency_change", projectId: 40, title: "Fix auth" });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/build/40");
  });

  it("renders comment_draft linking to drafts surface", () => {
    const signal = makeSignal({ type: "comment_draft", title: "Add test coverage" });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/build/inbox?view=drafts");
  });

  it("shows only the icon in collapsed mode — summary text is absent from the link itself", () => {
    mockUseAgentPulse.mockReturnValue({ data: makeSignal() });
    render(<BuildAgentPulse isCollapsed />);
    const link = screen.getByRole("link");
    expect(link.textContent).toBe("");
  });

  it("renders confidence badge for comment_draft with a set confidence value (BSN-03-043)", () => {
    const signal = makeSignal({ type: "comment_draft", title: "Add test coverage", confidence: 75 });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("does not render confidence badge when confidence is null for comment_draft (BSN-03-043)", () => {
    const signal = makeSignal({ type: "comment_draft", title: "Add test coverage", confidence: null });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });

  it("does not render confidence badge for non-comment_draft signals even if confidence field is present (BSN-03-043)", () => {
    const signal = makeSignal({ type: "overdue_approval", confidence: 90 });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(screen.queryByText("90%")).not.toBeInTheDocument();
  });

  it("renders evidence, proposed change and impact in tooltip for comment_draft (BSN-03-043)", () => {
    const signal = makeSignal({
      type: "comment_draft",
      title: "Add test coverage",
      evidence: "Ticket open 14 days",
      proposedChange: "Assign to senior dev",
      impact: "Unblocks Q4 milestone",
    });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed />);
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).toHaveTextContent("Evidence: Ticket open 14 days");
    expect(tooltip).toHaveTextContent("Proposed: Assign to senior dev");
    expect(tooltip).toHaveTextContent("Impact: Unblocks Q4 milestone");
  });

  it("renders affected record count in tooltip for comment_draft with affected records (BSN-03-043)", () => {
    const signal = makeSignal({
      type: "comment_draft",
      title: "Add test coverage",
      affectedRecordIds: [1, 2, 3],
    });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed />);
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).toHaveTextContent("3 affected records");
  });

  it("renders singular form for a single affected record (BSN-03-043)", () => {
    const signal = makeSignal({
      type: "comment_draft",
      title: "Add test coverage",
      affectedRecordIds: [7],
    });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed />);
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).toHaveTextContent("1 affected record");
  });

  it("does not render evidence details in tooltip for non-comment_draft signals (BSN-03-043)", () => {
    const signal = makeSignal({ type: "overdue_approval", evidence: "some evidence" });
    mockUseAgentPulse.mockReturnValue({ data: signal });
    render(<BuildAgentPulse isCollapsed />);
    const tooltip = screen.getByTestId("tooltip-content");
    expect(tooltip).not.toHaveTextContent("Evidence:");
  });

  it("renders nothing when signal has no evidence fields — quiet low-confidence draft is excluded upstream (BSN-03-046)", () => {
    mockUseAgentPulse.mockReturnValue({ data: null });
    const { container } = render(<BuildAgentPulse isCollapsed={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("resolves scope from pathname and passes it to useAgentPulse — two scopes must not share a cache (BSN-03-040)", () => {
    const { resolveBuildScope } = jest.requireMock("@/lib/build/build-scope") as {
      resolveBuildScope: jest.Mock;
    };
    const projectScope = {
      type: "project" as const,
      managedProductId: null,
      projectId: 7,
      basePath: "/build/7",
    };
    resolveBuildScope.mockReturnValue(projectScope);
    mockUseAgentPulse.mockReturnValue({ data: null });
    const { usePathname } = jest.requireMock("next/navigation") as { usePathname: jest.Mock };
    usePathname.mockReturnValue("/build/7");
    render(<BuildAgentPulse isCollapsed={false} />);
    expect(mockUseAgentPulse).toHaveBeenCalledWith(projectScope);
  });
});
