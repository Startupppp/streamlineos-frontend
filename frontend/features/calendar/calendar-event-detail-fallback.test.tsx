import { render, screen } from "@testing-library/react";
import { CalendarEventDetailFallback, CalendarSheetFallback } from "./calendar-lazy-fallbacks";

it("keeps the event loading state in the same responsive dialog surface", () => {
  render(<CalendarEventDetailFallback label="Loading event" />);
  const dialog = screen.getByRole("dialog", { name: "Loading event" });
  expect(dialog).toHaveAttribute("data-slot", "dialog-content");
  expect(dialog).toHaveClass("gap-0", "overflow-hidden", "p-0", "max-h-[92dvh]", "md:max-h-[90dvh]");
  expect(dialog).not.toHaveClass("right-0", "border-l", "max-w-sm");
  expect(screen.getByRole("status", { name: "Loading event" })).toBeInTheDocument();
});

it("uses the shared sheet surface for a Calendar panel loading state", () => {
  render(<CalendarSheetFallback label="Loading calendar accounts" />);
  const sheet = screen.getByRole("dialog", { name: "Loading calendar accounts" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(screen.getByRole("status", { name: "Loading calendar accounts" })).toBeInTheDocument();
});
