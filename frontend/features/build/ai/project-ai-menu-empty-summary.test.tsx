import { render } from "@testing-library/react";
import type { AiActionResult } from "@/components/ai";
import type { ProjectSummaryResult } from "@/types/projects/ai";
import { ProjectAiMenu } from "./project-ai-menu";

const mutateAsync = jest.fn<Promise<ProjectSummaryResult>, unknown[]>();
let capturedRun: ((signal?: AbortSignal) => Promise<AiActionResult>) | null = null;

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/hooks/common/use-animated-icon", () => ({
  useAnimatedIcon: () => ({ iconRef: { current: null }, hoverHandlers: {} }),
}));

jest.mock("@/hooks/api/build/ai", () => ({
  useProjectAiSummary: () => ({ mutateAsync, isPending: false }),
}));

jest.mock("@/components/ai/use-ai-popover-action", () => ({
  useAiPopoverAction: (options: {
    run: (signal?: AbortSignal) => Promise<AiActionResult>;
  }) => {
    capturedRun = options.run;
    return {
      open: false,
      state: { status: "loading" },
      isPending: false,
      execute: jest.fn(),
      retry: jest.fn(),
      cancel: jest.fn(),
      handleOpenChange: jest.fn(),
    };
  },
}));

jest.mock("@/components/ai", () => ({
  AiActionResultBody: () => <div data-testid="ai-body" />,
}));

function summaryResult(summary: string, totalTasks: number): ProjectSummaryResult {
  return {
    summary,
    highlights: [],
    atRisk: false,
    evidence: { totalTasks, done: 0, inProgress: 0, blocked: 0, overdue: 0 },
  };
}

async function runSummary(result: ProjectSummaryResult): Promise<AiActionResult> {
  mutateAsync.mockResolvedValueOnce(result);
  render(<ProjectAiMenu projectId={1} hideTrigger />);
  if (!capturedRun) throw new Error("summary runner was not registered");
  return capturedRun();
}

describe("ProjectAiMenu health summary empty state", () => {
  beforeEach(() => {
    capturedRun = null;
    mutateAsync.mockReset();
  });

  it("shows the empty panel when the project has no tickets", async () => {
    const result = await runSummary(
      summaryResult("This project has no tickets yet. Add tasks to unlock AI features.", 0),
    );
    expect(result.empty?.title).toBe("No issues to summarize");
  });

  it("keeps the AI summary when a project with tickets mentions no tickets yet", async () => {
    const text = "No tickets yet carry a Done label, but 10 are in progress.";
    const result = await runSummary(summaryResult(text, 10));
    expect(result.empty).toBeUndefined();
    expect(result.text).toContain(text);
  });
});
