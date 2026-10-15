import { render, screen } from "@testing-library/react";
import { CalendarSheetFallback } from "./calendar-lazy-fallbacks";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("uses the shared sheet surface for a Calendar panel loading state", () => {
  render(<CalendarSheetFallback label="Loading calendar accounts" />);
  const sheet = screen.getByRole("dialog", { name: "Loading calendar accounts" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(screen.getByRole("status", { name: "Loading calendar accounts" })).toBeInTheDocument();
  expect(document.querySelector(".skeleton-shimmer")).toBeNull();
});

it("opens the loading surface from the bottom on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  render(<CalendarSheetFallback label="Loading resource capacity" />);
  expect(screen.getByRole("dialog", { name: "Loading resource capacity" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
});
