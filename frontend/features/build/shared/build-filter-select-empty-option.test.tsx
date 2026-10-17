import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";

const itemValues: string[] = [];
let selectValue: string | undefined;
let selectOnValueChange: ((value: string) => void) | undefined;

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => {
    selectValue = value;
    selectOnValueChange = onValueChange;
    return <div>{children}</div>;
  },
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    itemValues.push(value);
    return <div>{children}</div>;
  },
}));

import { BuildFilterSelect } from "./build-filter-select";

const CLEAR_OPTION = { value: "", label: "All teams" };
const TEAM_OPTION = { value: "7", label: "Platform" };

function renderWithClearOption(value: string, onValueChange = jest.fn()) {
  render(
    <BuildFilterSelect
      label="Team"
      value={value}
      onValueChange={onValueChange}
      options={[CLEAR_OPTION, TEAM_OPTION]}
    />,
  );
  return onValueChange;
}

beforeEach(() => {
  itemValues.length = 0;
  selectValue = undefined;
  selectOnValueChange = undefined;
});

describe("BuildFilterSelect carries a clear-the-filter option, which Radix refuses to render as an empty string", () => {
  it("never hands Select.Item an empty value, because Radix throws on one and takes the console with it", () => {
    renderWithClearOption("");

    expect(itemValues.length).toBe(2);
    expect(itemValues).not.toContain("");
  });

  it("still renders the clear option's label, so the reader keeps the way to clear the filter", () => {
    renderWithClearOption("");

    expect(screen.getByText("All teams")).toBeInTheDocument();
  });

  it("leaves a real option's value untouched", () => {
    renderWithClearOption("");

    expect(itemValues).toContain("7");
  });

  it("marks the clear option as selected when the caller holds no filter, rather than falling back to the placeholder", () => {
    renderWithClearOption("");

    expect(selectValue).toBeDefined();
    expect(selectValue).not.toBe("");
  });

  it("reports the clear option back to the caller as an empty string, so no call site has to learn a sentinel", () => {
    const onValueChange = renderWithClearOption("");

    const clearValue = itemValues[0];
    selectOnValueChange?.(clearValue);

    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("reports a real option back unchanged", () => {
    const onValueChange = renderWithClearOption("");

    selectOnValueChange?.("7");

    expect(onValueChange).toHaveBeenCalledWith("7");
  });
});
