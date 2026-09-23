import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RiskMatrix } from "./risk-matrix";
import { getRiskSeverity } from "./risk-severity";

it("names all empty cells and lets a keyboard user choose a probability and impact", async () => {
  const onCellClick = jest.fn();
  render(<RiskMatrix cells={[]} onCellClick={onCellClick} />);
  expect(screen.getAllByRole("button", { name: /probability, .* impact: 0 open risks/ })).toHaveLength(9);
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByRole("button", { name: "low probability, high impact: 0 open risks" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onCellClick).toHaveBeenCalledWith("low", "high");
});

it("exposes the currently selected risk filter", () => {
  render(<RiskMatrix cells={[]} selectedCell={{ probability: "high", impact: "high" }} />);
  expect(screen.getByRole("button", { pressed: true })).toHaveAccessibleName("high probability, high impact: 0 open risks");
});

it("renders the server's open-risk count for a cell instead of counting the rows the page happens to have loaded", () => {
  render(
    <RiskMatrix
      cells={[
        { probability: "high", impact: "high", openCount: 137 },
        { probability: "low", impact: "low", openCount: 4 },
      ]}
    />,
  );
  expect(screen.getByRole("button", { name: "high probability, high impact: 137 open risks" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "low probability, low impact: 4 open risks" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "medium probability, medium impact: 0 open risks" })).toBeInTheDocument();
});

it("agrees with the backend's score >= 6 high-critical threshold for every probability and impact pair, so the tile and the badge can never disagree", () => {
  const LEVELS = ["low", "medium", "high"] as const;
  const SCORE: Record<(typeof LEVELS)[number], number> = { low: 1, medium: 2, high: 3 };
  for (const probability of LEVELS) {
    for (const impact of LEVELS) {
      const { label } = getRiskSeverity(probability, impact);
      expect(SCORE[probability] * SCORE[impact] >= 6).toBe(label === "High" || label === "Critical");
    }
  }
});
