import { render, screen } from "@testing-library/react";
import { CalendarMonthYearPicker } from "./calendar-month-year-picker";

describe("CalendarMonthYearPicker", () => {
  it("keeps the month and year trigger at its natural width", () => {
    render(
      <CalendarMonthYearPicker
        currentDate={new Date(2026, 6, 1)}
        title="July 2026"
        onDateChange={jest.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Choose month and year" })).toHaveClass(
      "w-fit",
      "shrink-0",
      "whitespace-nowrap",
    );
  });
});
