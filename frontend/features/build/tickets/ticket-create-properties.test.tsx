import { render, screen } from "@testing-library/react";
import { TicketCreateProperties, type CreateTicketPropertiesValue } from "./ticket-create-properties";

const DEFAULT_VALUE: CreateTicketPropertiesValue = {
  status: "TODO",
  priority: null,
  assigneeId: null,
  points: null,
  labelIds: [],
  cycleId: null,
};

function renderProperties(value: CreateTicketPropertiesValue, onChange = jest.fn()) {
  return render(
    <TicketCreateProperties
      value={value}
      onChange={onChange}
      projectStatuses={[]}
      members={[]}
      labels={[]}
      cycles={[]}
    />,
  );
}

it("clears the estimate input when value.points is reset to null by create-more, so stale points are not displayed after the form resets", () => {
  const { rerender } = renderProperties({ ...DEFAULT_VALUE, points: 5 });

  const input = screen.getByRole("spinbutton", { name: "Story points" }) as HTMLInputElement;
  expect(input.value).toBe("5");

  rerender(
    <TicketCreateProperties
      value={{ ...DEFAULT_VALUE, points: null }}
      onChange={jest.fn()}
      projectStatuses={[]}
      members={[]}
      labels={[]}
      cycles={[]}
    />,
  );

  expect(input.value).toBe("");
});

it("preserves a non-null estimate when value.points has a valid number", () => {
  renderProperties({ ...DEFAULT_VALUE, points: 3 });

  const input = screen.getByRole("spinbutton", { name: "Story points" }) as HTMLInputElement;
  expect(input.value).toBe("3");
});
