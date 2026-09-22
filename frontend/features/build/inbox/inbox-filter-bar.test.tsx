import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { InboxFilterBar } from "./inbox-filter-bar";

jest.useFakeTimers();

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
