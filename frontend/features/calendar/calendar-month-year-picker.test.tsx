import { render, screen } from "@testing-library/react";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";

/**
 * Day and week navigation moved the period while the live region still read
 * "Showing September 2026". The caller owns the granularity of `title`; this
 * component owns the announcement, and an announcement only reaches a reader
 * when the SAME live element's text changes. A region re-created per title is
 * a new node with no previous value, so assistive tech has nothing to compare
 * and stays silent — hence the identity assertion below.
 */
describe("CalendarMonthYearPicker — period announcement", () => {
  it("announces the new period when the title changes", () => {
    const { rerender } = render(
      <CalendarMonthYearPicker
        currentDate={new Date(2026, 8, 14)}
        title="September 14, 2026"
        onDateChange={jest.fn()}
      />,
    );

    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live).toHaveTextContent("Showing September 14, 2026");

    rerender(
      <CalendarMonthYearPicker
        currentDate={new Date(2026, 8, 15)}
        title="September 15, 2026"
        onDateChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("status")).toBe(live);
    expect(live).toHaveTextContent("Showing September 15, 2026");
  });

  it("keeps the announcement in one text node so the whole sentence is spoken", () => {
    render(
      <CalendarMonthYearPicker
        currentDate={new Date(2026, 8, 14)}
        title="Sep 14 – Sep 20, 2026"
        onDateChange={jest.fn()}
      />,
    );

    const live = screen.getByRole("status");
    expect(live.childNodes).toHaveLength(1);
    expect(live.textContent).toBe("Showing Sep 14 – Sep 20, 2026");
  });
});

describe("CalendarMonthYearPicker", () => {
  it("keeps the month and year trigger at its natural width", () => {
    render(
      <CalendarMonthYearPicker
        currentDate={new Date(2026, 6, 1)}
        title="July 2026"
        onDateChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /^Choose month and year/ })).toHaveClass(
      "w-fit",
      "shrink-0",
      "whitespace-nowrap",
    );
  });
});
