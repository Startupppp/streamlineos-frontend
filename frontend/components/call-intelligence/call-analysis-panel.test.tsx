import { render, screen } from "@testing-library/react";
import type { CallAnalysisResponse } from "@/types/crm/call-intelligence";
import { CallAnalysisPanel } from "./call-analysis-panel";

const mockAnalysis = jest.fn();
const mockCan = jest.fn();
const mockRun = jest.fn();
const mockRelease = jest.fn();

jest.mock("@/hooks/api/crm/call-intelligence", () => ({
  useCallAnalysis: () => mockAnalysis(),
  useRunCallAnalysis: () => mockRun(),
  useReleaseCallAnalysis: () => mockRelease(),
}));
jest.mock("@/hooks/api/access", () => ({ useCan: () => mockCan() }));

const gate = { permission: "crm:call-analysis:view", allowed: true, denied: false, pending: false };

const idle = (over: Record<string, unknown> = {}) => ({
  data: undefined,
  isLoading: false,
  error: null,
  access: gate,
  ...over,
});

const analysed = (): CallAnalysisResponse => ({
  data: {
    activityId: "a-1",
    transcriptHash: "abc",
    analyzerVersion: 1,
    talkRatioBps: 4_200,
    questionRateBps: 1_800,
    repTurnCount: 20,
    repQuestionCount: 4,
    objections: [
      { quote: "It is more than we budgeted.", handling: "answered", response: "We can phase it." },
    ],
    competitorMentions: [{ name: "Rivalsoft", quote: "We already looked at Rivalsoft." }],
    nextStepCommitted: true,
    nextStep: "Send the phased proposal by Friday.",
    model: "test-model",
    transcriptChars: 900,
    analysedAt: "2026-08-29T10:00:00.000Z",
  },
  cached: true,
  visibility: {
    visible: true,
    reason: "own-call",
    opensAt: null,
    privateWindowHours: 24,
  },
});

describe("CallAnalysisPanel", () => {
  beforeEach(() => {
    mockCan.mockReturnValue(true);
    mockRun.mockReturnValue({ mutate: jest.fn(), isPending: false });
    mockRelease.mockReturnValue({ mutate: jest.fn(), isPending: false });
  });

  it("shows the analysis when the viewer may read it", () => {
    mockAnalysis.mockReturnValue(idle({ data: analysed() }));
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.getByText("42%")).toBeInTheDocument();
    expect(screen.getByText("It is more than we budgeted.")).toBeInTheDocument();
    expect(screen.getByText("Rivalsoft")).toBeInTheDocument();
  });

  /**
   * The four kinds of nothing. Each has a different product answer, and
   * collapsing them is how a team spends credits re-running a call that can
   * never be analysed.
   */
  it("offers to analyse a call nobody has run yet", () => {
    mockAnalysis.mockReturnValue(idle({ error: { status: 404, message: "not analysed" } }));
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.getByText("Not analysed yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Analyse this call/ })).toBeInTheDocument();
  });

  it("never offers to retry a call the consent rule refuses", () => {
    mockAnalysis.mockReturnValue(
      idle({ error: { status: 422, message: "Recording consent was not recorded." } }),
    );
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.getByText("This call cannot be analysed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Analyse this call/ })).not.toBeInTheDocument();
  });

  it("says when an embargoed analysis opens rather than calling it missing", () => {
    mockAnalysis.mockReturnValue(
      idle({
        data: {
          data: null,
          cached: true,
          visibility: {
            visible: false,
            reason: "rep-window",
            opensAt: "2026-08-30T10:00:00.000Z",
            privateWindowHours: 24,
          },
        },
      }),
    );
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.getByText("Still with the rep")).toBeInTheDocument();
    expect(screen.queryByText("Not analysed yet")).not.toBeInTheDocument();
  });

  it("does not offer the analyse button without the run permission", () => {
    mockCan.mockReturnValue(false);
    mockAnalysis.mockReturnValue(idle({ error: { status: 404, message: "not analysed" } }));
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.queryByRole("button", { name: /Analyse this call/ })).not.toBeInTheDocument();
  });

  /** Ticket 26, one layer down: a denied read is not an unanalysed call. */
  it("renders denial rather than emptiness when the gate refuses", () => {
    mockAnalysis.mockReturnValue(
      idle({ access: { ...gate, allowed: false, denied: true } }),
    );
    render(<CallAnalysisPanel activityId="a-1" />);

    expect(screen.getByText("crm:call-analysis:view")).toBeInTheDocument();
    expect(screen.queryByText("Not analysed yet")).not.toBeInTheDocument();
  });
});
