import { render, screen } from "@testing-library/react";
import { CalendarSheetFallback } from "./calendar-lazy-fallbacks";

it("uses the shared sheet surface for a Calendar panel loading state", () => {
  render(<CalendarSheetFallback label="Loading calendar accounts" />);
  const sheet = screen.getByRole("dialog", { name: "Loading calendar accounts" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(screen.getByRole("status", { name: "Loading calendar accounts" })).toBeInTheDocument();
});
