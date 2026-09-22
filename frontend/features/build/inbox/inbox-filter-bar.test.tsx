import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { InboxFilterBar } from "./inbox-filter-bar";

jest.useFakeTimers();

jest.mock("@/components/ui/select", () => {
  const React = require("react");
  const SelectCtx = React.createContext<{ onValueChange?: (v: string) => void }>({});

  function Select({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) {
    return (
      <SelectCtx.Provider value={{ onValueChange }}>
        <div data-value={value}>{children}</div>
      </SelectCtx.Provider>
    );
  }
  function SelectTrigger({ children, "aria-label": ariaLabel }: { children: React.ReactNode; "aria-label"?: string; className?: string }) {
    return <button type="button" role="combobox" aria-label={ariaLabel}>{children}</button>;
  }
  function SelectValue({ placeholder }: { placeholder?: string }) {
    return <span>{placeholder}</span>;
  }
  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }
  function SelectItem({ value, children }: { value: string; children: React.ReactNode }) {
    const { onValueChange } = React.useContext(SelectCtx);
    return (
      <div role="option" onClick={() => onValueChange?.(value)}>
        {children}
      </div>
    );
  }
  return { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
});

const noop = () => undefined;

describe("InboxFilterBar — search debounce", () => {
  it("calls onQChange with the typed value after 300ms", async () => {
    const onQChange = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={null}
        hasActiveFilters={false}
        onQChange={onQChange}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "bug", { delay: null });
    expect(onQChange).not.toHaveBeenCalledWith("bug");
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onQChange).toHaveBeenCalledWith("bug");
  });

  it("does not call onQChange before 300ms have elapsed", async () => {
    const onQChange = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={null}
        hasActiveFilters={false}
        onQChange={onQChange}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    const input = screen.getByRole("searchbox");
    await userEvent.type(input, "x", { delay: null });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(onQChange).not.toHaveBeenCalledWith("x");
  });

  it("shows a clear-filters button when hasActiveFilters is true", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q="bug"
        type={null}
        hasActiveFilters
        onQChange={noop}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("does not show clear-filters button when hasActiveFilters is false", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={null}
        hasActiveFilters={false}
        onQChange={noop}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    expect(screen.queryByRole("button", { name: /clear filters/i })).toBeNull();
  });

  it("calls onClearFilters when the clear button is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onClearFilters = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q="foo"
        type={null}
        hasActiveFilters
        onQChange={noop}
        onTypeChange={noop}
        onClearFilters={onClearFilters}
        searchInputRef={ref}
      />,
    );
    await user.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("initialises the local input value from the q prop", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q="deployment"
        type={null}
        hasActiveFilters
        onQChange={noop}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    expect(screen.getByRole("searchbox")).toHaveValue("deployment");
  });
});

describe("InboxFilterBar — type category select", () => {
  it("renders a combobox with accessible label", () => {
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={null}
        hasActiveFilters={false}
        onQChange={noop}
        onTypeChange={noop}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    expect(screen.getByRole("combobox", { name: /filter by category/i })).toBeInTheDocument();
  });

  it("calls onTypeChange with the chosen category when a valid option is selected", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onTypeChange = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={null}
        hasActiveFilters={false}
        onQChange={noop}
        onTypeChange={onTypeChange}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    await user.click(screen.getByRole("option", { name: "PROJECTS" }));
    expect(onTypeChange).toHaveBeenCalledWith("PROJECTS");
  });

  it("calls onTypeChange with null when All types is selected", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onTypeChange = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={"PROJECTS" as const}
        hasActiveFilters
        onQChange={noop}
        onTypeChange={onTypeChange}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    await user.click(screen.getByRole("option", { name: "All types" }));
    expect(onTypeChange).toHaveBeenCalledWith(null);
  });

  it("does not call onTypeChange with PROJECTS when All types is selected", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const onTypeChange = jest.fn();
    const ref = React.createRef<HTMLInputElement>();
    render(
      <InboxFilterBar
        q={null}
        type={"PROJECTS" as const}
        hasActiveFilters
        onQChange={noop}
        onTypeChange={onTypeChange}
        onClearFilters={noop}
        searchInputRef={ref}
      />,
    );
    await user.click(screen.getByRole("option", { name: "All types" }));
    expect(onTypeChange).not.toHaveBeenCalledWith("PROJECTS");
  });
});
