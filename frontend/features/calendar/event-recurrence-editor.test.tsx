import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { RecurrenceEditor } from "./event-recurrence-editor";
import {
  defaultRecurrenceState,
  type RecurrenceState,
} from "./event-recurrence-schema";

interface HarnessProps {
  initial: RecurrenceState;
  onStateChange: (next: RecurrenceState) => void;
}

function RecurrenceEditorHarness({ initial, onStateChange }: HarnessProps) {
  const [state, setState] = useState<RecurrenceState>(initial);

  function handleChange(next: RecurrenceState) {
    onStateChange(next);
    setState(next);
  }

  return <RecurrenceEditor state={state} onChange={handleChange} />;
}

function renderWeekly(byDay: RecurrenceState["byDay"]) {
  const onStateChange = jest.fn<void, [RecurrenceState]>();
  render(
    <RecurrenceEditorHarness
      initial={{ ...defaultRecurrenceState("2026-03-09"), freq: "WEEKLY", byDay }}
      onStateChange={onStateChange}
    />,
  );
  return onStateChange;
}

describe("RecurrenceEditor — weekday toggles", () => {
  it("adds the clicked day, and only that day, to BYDAY", () => {
    const onStateChange = renderWeekly(["MO"]);

    fireEvent.click(screen.getByRole("button", { name: "Wed" }));

    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange.mock.calls[0]?.[0].byDay).toEqual(["MO", "WE"]);
  });

  it("keeps each button bound to its own day across successive clicks", () => {
    const onStateChange = renderWeekly(["MO"]);

    fireEvent.click(screen.getByRole("button", { name: "Wed" }));
    fireEvent.click(screen.getByRole("button", { name: "Fri" }));

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ byDay: ["MO", "WE", "FR"] }),
    );
    expect(
      screen.getByRole("button", { name: "Mon" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Tue" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("removes a selected day when it is clicked again", () => {
    const onStateChange = renderWeekly(["MO", "WE"]);

    fireEvent.click(screen.getByRole("button", { name: "Mon" }));

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ byDay: ["WE"] }),
    );
  });
});

describe("RecurrenceEditor — end-type options", () => {
  it("selects the end type of the radio that was clicked", () => {
    const onStateChange = jest.fn<void, [RecurrenceState]>();
    render(
      <RecurrenceEditorHarness
        initial={{ ...defaultRecurrenceState("2026-03-09"), freq: "DAILY" }}
        onStateChange={onStateChange}
      />,
    );

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[1] as HTMLInputElement);

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ endType: "count" }),
    );
    expect(screen.getByDisplayValue("10")).not.toBeNull();
  });

  it("moves the selection between end types without carrying a stale value", () => {
    const onStateChange = jest.fn<void, [RecurrenceState]>();
    render(
      <RecurrenceEditorHarness
        initial={{
          ...defaultRecurrenceState("2026-03-09"),
          freq: "DAILY",
          endType: "count",
        }}
        onStateChange={onStateChange}
      />,
    );

    const radios = screen.getAllByRole("radio");
    fireEvent.click(radios[2] as HTMLInputElement);

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ endType: "until" }),
    );

    fireEvent.click(radios[0] as HTMLInputElement);

    expect(onStateChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ endType: "never" }),
    );
  });
});
