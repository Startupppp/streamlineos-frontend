import { render, screen } from "@testing-library/react";
import { HolidaySheet } from "./holiday-sheet";

describe("the holiday drawer lets zod answer a blank submit, not the browser", () => {
  it("renders a form the browser will not validate, so the inline messages are reachable", () => {
    render(
      <HolidaySheet
        open
        editingHoliday={null}
        isPending={false}
        onOpenChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    const form = screen.getByRole("button", { name: "Add holiday" }).closest("form");
    expect(form).not.toBeNull();
    expect(form).toHaveAttribute("novalidate");
  });
});
