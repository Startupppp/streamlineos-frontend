import { act, renderHook } from "@testing-library/react";
import { useWeekGridCells } from "./use-week-grid-cells";
import type { GridRow } from "./week-grid-rows";
import type { TimesheetEntry } from "@/features/timesheets";

type Mutation = { mutate: jest.Mock; isPending: boolean; isError: boolean; isSuccess: boolean };

function idleMutation(): Mutation {
  return { mutate: jest.fn(), isPending: false, isError: false, isSuccess: false };
}

const ROW: GridRow = {
  rowKey: "project-4",
  projectId: 4,
  ticketId: null,
  projectLabel: "StreamlineOS",
  ticketLabel: null,
} as unknown as GridRow;

const DAYS = ["2026-09-14", "2026-09-15"];

function setup(overrides?: { entryMap?: Map<string, TimesheetEntry>; succeeded?: boolean }) {
  const createEntry = idleMutation();
  const updateEntry = idleMutation();
  const voidEntry = idleMutation();
  if (overrides?.succeeded) createEntry.isSuccess = true;

  const view = renderHook(() =>
    useWeekGridCells({
      entryMap: overrides?.entryMap ?? new Map<string, TimesheetEntry>(),
      allRows: [ROW],
      days: DAYS,
      createEntry: createEntry as never,
      updateEntry: updateEntry as never,
      voidEntry: voidEntry as never,
    }),
  );
  return { view, createEntry, updateEntry, voidEntry };
}

function blurEvent(cellKey: string) {
  return {
    currentTarget: {
      dataset: {
        cellKey,
        rowKey: ROW.rowKey,
        date: DAYS[0],
        row: JSON.stringify(ROW),
      },
    },
  } as unknown as React.FocusEvent<HTMLInputElement>;
}

function focusEvent(cellKey: string, hours: string) {
  return {
    currentTarget: { dataset: { cellKey, hours } },
  } as unknown as React.FocusEvent<HTMLInputElement>;
}

function changeEvent(value: string) {
  return { target: { value } } as unknown as React.ChangeEvent<HTMLInputElement>;
}

describe("an out-of-range hour value is refused with a reason instead of vanishing", () => {
  it.each([["-1"], ["25"], ["abc"]])("refuses %s and fires no mutation", (typed) => {
    const { view, createEntry, updateEntry, voidEntry } = setup();
    const cellKey = `${ROW.rowKey}-${DAYS[0]}`;

    act(() => view.result.current.handleCellFocus(focusEvent(cellKey, "")));
    act(() => view.result.current.handleCellChange(changeEvent(typed)));
    act(() => view.result.current.handleCellBlur(blurEvent(cellKey)));

    expect(createEntry.mutate).not.toHaveBeenCalled();
    expect(updateEntry.mutate).not.toHaveBeenCalled();
    expect(voidEntry.mutate).not.toHaveBeenCalled();
    expect(view.result.current.cellError).toBe("Hours must be between 0 and 24.");
  });

  it("never reports Hours saved for a value it rejected, even after an earlier success", () => {
    const { view } = setup({ succeeded: true });
    const cellKey = `${ROW.rowKey}-${DAYS[0]}`;

    act(() => view.result.current.handleCellFocus(focusEvent(cellKey, "")));
    act(() => view.result.current.handleCellChange(changeEvent("-1")));
    act(() => view.result.current.handleCellBlur(blurEvent(cellKey)));

    expect(view.result.current.saveStatus).toBe("Hours must be between 0 and 24.");
  });

  it("accepts a valid boundary value", () => {
    const { view, createEntry } = setup();
    const cellKey = `${ROW.rowKey}-${DAYS[0]}`;

    act(() => view.result.current.handleCellFocus(focusEvent(cellKey, "")));
    act(() => view.result.current.handleCellChange(changeEvent("24")));
    act(() => view.result.current.handleCellBlur(blurEvent(cellKey)));

    expect(createEntry.mutate).toHaveBeenCalledTimes(1);
    expect(view.result.current.cellError).toBeNull();
  });
});

describe("pressing Enter commits a cell once, not twice", () => {
  it("ignores the blur that focusing the next cell induces", () => {
    const { view, createEntry } = setup();
    const cellKey = `${ROW.rowKey}-${DAYS[0]}`;

    act(() => view.result.current.handleCellFocus(focusEvent(cellKey, "")));
    act(() => view.result.current.handleCellChange(changeEvent("2")));

    const keyEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      currentTarget: {
        dataset: {
          cellKey,
          rowKey: ROW.rowKey,
          date: DAYS[0],
          row: JSON.stringify(ROW),
        },
        selectionStart: null,
        selectionEnd: null,
        value: "2",
      },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => view.result.current.handleCellKeyDown(keyEvent));
    act(() => view.result.current.handleCellBlur(blurEvent(cellKey)));

    expect(createEntry.mutate).toHaveBeenCalledTimes(1);
  });

  it("still commits a NEW value typed into the same cell after Enter, so the edit is not swallowed on the last row", () => {
    const { view, createEntry } = setup();
    const cellKey = `${ROW.rowKey}-${DAYS[0]}`;

    act(() => view.result.current.handleCellFocus(focusEvent(cellKey, "")));
    act(() => view.result.current.handleCellChange(changeEvent("2")));

    const keyEvent = {
      key: "Enter",
      preventDefault: jest.fn(),
      currentTarget: {
        dataset: {
          cellKey,
          rowKey: ROW.rowKey,
          date: DAYS[0],
          row: JSON.stringify(ROW),
        },
        selectionStart: null,
        selectionEnd: null,
        value: "2",
      },
    } as unknown as React.KeyboardEvent<HTMLInputElement>;

    act(() => view.result.current.handleCellKeyDown(keyEvent));
    act(() => view.result.current.handleCellChange(changeEvent("5")));
    act(() => view.result.current.handleCellBlur(blurEvent(cellKey)));

    expect(createEntry.mutate).toHaveBeenCalledTimes(2);
    expect(createEntry.mutate).toHaveBeenLastCalledWith(
      expect.objectContaining({ hours: 5 }),
    );
  });
});
