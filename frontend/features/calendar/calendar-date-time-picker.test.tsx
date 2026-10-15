import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { CalendarDateTimePicker } from "./calendar-date-time-picker";

beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => undefined;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

function ControlledPicker({ initialValue, clearable = false }: { initialValue: string; clearable?: boolean }) {
  const [value, setValue] = useState(initialValue);
  return <>
    <CalendarDateTimePicker id="meeting-time" label="Meeting time" value={value} onChange={setValue} clearable={clearable} />
    <output data-testid="value">{value}</output>
  </>;
}

describe("CalendarDateTimePicker", () => {
  it("changes the selected local hour without shifting the date or minute", async () => {
    const user = userEvent.setup();
    render(<ControlledPicker initialValue="2026-10-20T16:37" />);

    await user.click(screen.getByRole("combobox", { name: "Meeting time hour" }));
    await user.click(screen.getByRole("option", { name: "17" }));

    expect(screen.getByTestId("value")).toHaveTextContent("2026-10-20T17:37");
  });

  it("keeps an optional date-time empty when cleared", async () => {
    const user = userEvent.setup();
    render(<ControlledPicker initialValue="2026-10-20T16:37" clearable />);

    await user.click(screen.getByRole("button", { name: "Clear Meeting time date" }));

    expect(screen.getByTestId("value")).toBeEmptyDOMElement();
    expect(screen.getByRole("combobox", { name: "Meeting time hour" })).toBeDisabled();
    expect(screen.getByRole("combobox", { name: "Meeting time minute" })).toBeDisabled();
  });
});
