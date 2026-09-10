import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RiskMatrix } from "./risk-matrix";

it("names all empty cells and lets a keyboard user choose a probability and impact", async () => {
  const onCellClick = jest.fn();
  render(<RiskMatrix risks={[]} onCellClick={onCellClick} />);
  expect(screen.getAllByRole("button", { name: /probability, .* impact: 0 open risks/ })).toHaveLength(9);
  const user = userEvent.setup();
  await user.tab();
  expect(screen.getByRole("button", { name: "low probability, high impact: 0 open risks" })).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(onCellClick).toHaveBeenCalledWith("low", "high");
});

it("exposes the currently selected risk filter", () => {
  render(<RiskMatrix risks={[]} selectedCell={{ probability: "high", impact: "high" }} />);
  expect(screen.getByRole("button", { pressed: true })).toHaveAccessibleName("high probability, high impact: 0 open risks");
});
