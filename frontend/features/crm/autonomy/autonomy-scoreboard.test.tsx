import { render, screen } from "@testing-library/react";
import type { DatasetHealthTrend, Scoreboard } from "@/types/crm/autonomy";
import { permissionGate } from "@/lib/rbac/permission-gate";
import { AutonomyScoreboard } from "./autonomy-scoreboard";

const allowed = permissionGate("crm:autonomy:view", true, true);

const mockUseScoreboard = jest.fn();
jest.mock("@/hooks/api/crm/autonomy", () => ({
  useAutonomyScoreboard: (days: number) => mockUseScoreboard(days),
}));

const board = (over: Partial<Scoreboard> = {}): Scoreboard => ({
  since: "2026-07-25T00:00:00.000Z",
  days: 30,
  perKind: [
    {
      kind: "stage.advanced",
      actions: 120,
      corrections: 3,
      correctionRate: 0.025,
      shadowScored: 12,
      shadowDisagreed: 1,
      shadowDisagreementRate: 1 / 12,
    },
    {
      kind: "task.extracted",
      actions: 0,
      corrections: 0,
      correctionRate: null,
      shadowScored: 0,
      shadowDisagreed: 0,
      shadowDisagreementRate: null,
    },
  ],
  dataset: dataset(),
  spend: { calls: 140, totalTokens: 91_000, estimatedCostUsd: "1.2345" },
  ...over,
});

const dataset = (over: Partial<DatasetHealthTrend> = {}): DatasetHealthTrend => ({
  windowDays: 30,
  current: {
    // 2 high + 1 medium + 5 low, weighted 8/3/1.
    composite: 24,
    openTotal: 8,
    bySeverity: { high: 2, medium: 1, low: 5 },
    byClass: [
      { producer: "duplicate", count: 2, weight: 16 },
      { producer: "staleness", count: 5, weight: 5 },
      { producer: "contradiction", count: 1, weight: 3 },
    ],
  },
  series: [
    { capturedOn: "2026-07-25", composite: 40, openTotal: 14 },
    { capturedOn: "2026-08-24", composite: 24, openTotal: 8 },
  ],
  baseline: { capturedOn: "2026-07-25", composite: 40, openTotal: 14 },
  delta: -16,
  direction: "improving",
  ...over,
});

describe("AutonomyScoreboard", () => {
  beforeEach(() => {
    mockUseScoreboard.mockReturnValue({ access: allowed, data: board(), isLoading: false });
  });

  it("shows the correction rate per action type", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText("Moved a deal")).toBeInTheDocument();
    expect(screen.getByText("3%")).toBeInTheDocument();
    expect(screen.getByText("120 actions, 3 corrected")).toBeInTheDocument();
  });

  /**
   * "0%" over three actions and "0%" over four hundred are different claims.
   * Showing them identically is how a scoreboard becomes reassuring rather than
   * informative.
   */
  it("shows the denominator while the sample is small", () => {
    mockUseScoreboard.mockReturnValue({
      access: allowed,
      data: board({
        perKind: [
          {
            kind: "stage.advanced",
            actions: 4,
            corrections: 0,
            correctionRate: 0,
            shadowScored: 0,
            shadowDisagreed: 0,
            shadowDisagreementRate: null,
          },
        ],
      }),
      isLoading: false,
    });

    render(<AutonomyScoreboard />);
    expect(screen.getByText("0% of 4")).toBeInTheDocument();
  });

  /**
   * A rate of zero and no data yet mean opposite things to somebody deciding
   * whether to trust an action type.
   */
  it("does not claim perfection for something that never happened", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText("Has not happened yet")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("reports what the second opinion found", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText("1 of 12 disagreed")).toBeInTheDocument();
  });

  it("shows spend, so an unprofitable tenant is visible before the invoice", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText(/140 model calls/)).toBeInTheDocument();
    expect(screen.getByText(/\$1\.23/)).toBeInTheDocument();
  });
});

describe("when the numbers cannot be read", () => {
  /**
   * A card with a heading and nothing under it reads as "there is no data",
   * which is the opposite of what a failed request means — and on a scoreboard,
   * "nothing to correct" is exactly the reassuring lie worth avoiding.
   */
  it("says so, rather than rendering an empty card", () => {
    mockUseScoreboard.mockReturnValue({ access: allowed, data: undefined, isLoading: false, isError: true });
    render(<AutonomyScoreboard />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
    // And it does not imply the measurement itself is missing.
    expect(alert).toHaveTextContent(/still being recorded/i);
  });

  it("does not show a rate of any kind while it cannot read one", () => {
    mockUseScoreboard.mockReturnValue({ access: allowed, data: undefined, isLoading: false, isError: true });
    render(<AutonomyScoreboard />);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});

/**
 * Dataset health is on this card rather than a data-quality one of its own,
 * because a rising correction rate and worsening data are usually one story.
 */
describe("the dataset behind the numbers", () => {
  beforeEach(() => {
    mockUseScoreboard.mockReturnValue({ access: allowed, data: board(), isLoading: false });
  });

  it("shows the composite with the raw count beside it", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText("24")).toBeInTheDocument();
    // The weighted number alone cannot say whether it is three bad
    // contradictions or twenty-four stale leads.
    expect(screen.getByText(/8 open · 2 high, 1 medium, 5 low/)).toBeInTheDocument();
  });

  it("says which way it moved, and that down is better", () => {
    render(<AutonomyScoreboard />);
    expect(screen.getByText("16 better over 30 days")).toBeInTheDocument();
  });

  it("breaks the number down by class, heaviest first", () => {
    render(<AutonomyScoreboard />);
    const classes = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(classes[0]).toContain("Duplicate records");
    expect(classes[0]).toContain("16");
  });

  /**
   * The distinction the whole trend rests on. A tenant whose queue was switched
   * on this morning has no direction — rendering that as "unchanged" would claim
   * a month of flat data that was never recorded.
   */
  it("does not invent a direction before there is history", () => {
    mockUseScoreboard.mockReturnValue({
      access: allowed,
      data: board({ dataset: dataset({ series: [], baseline: null, delta: null, direction: null }) }),
      isLoading: false,
    });

    render(<AutonomyScoreboard />);
    expect(screen.getByText(/No earlier reading yet/)).toBeInTheDocument();
    expect(screen.queryByText(/unchanged over/i)).not.toBeInTheDocument();
  });

  it("draws no line from a single point", () => {
    mockUseScoreboard.mockReturnValue({
      access: allowed,
      data: board({
        dataset: dataset({
          series: [{ capturedOn: "2026-08-24", composite: 24, openTotal: 8 }],
        }),
      }),
      isLoading: false,
    });

    render(<AutonomyScoreboard />);
    expect(screen.queryByRole("img", { name: /Dataset health over/ })).not.toBeInTheDocument();
  });

  it("says nothing is open rather than showing a bare zero", () => {
    mockUseScoreboard.mockReturnValue({
      access: allowed,
      data: board({
        dataset: dataset({
          current: {
            composite: 0,
            openTotal: 0,
            bySeverity: { high: 0, medium: 0, low: 0 },
            byClass: [],
          },
        }),
      }),
      isLoading: false,
    });

    render(<AutonomyScoreboard />);
    expect(screen.getByText("Nothing open")).toBeInTheDocument();
  });
});
