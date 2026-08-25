import { render, screen } from "@testing-library/react";
import type { Scoreboard } from "@/types/crm/autonomy";
import { AutonomyScoreboard } from "./autonomy-scoreboard";

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
  spend: { calls: 140, totalTokens: 91_000, estimatedCostUsd: "1.2345" },
  ...over,
});

describe("AutonomyScoreboard", () => {
  beforeEach(() => {
    mockUseScoreboard.mockReturnValue({ data: board(), isLoading: false });
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
    mockUseScoreboard.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<AutonomyScoreboard />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
    // And it does not imply the measurement itself is missing.
    expect(alert).toHaveTextContent(/still being recorded/i);
  });

  it("does not show a rate of any kind while it cannot read one", () => {
    mockUseScoreboard.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    render(<AutonomyScoreboard />);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });
});
