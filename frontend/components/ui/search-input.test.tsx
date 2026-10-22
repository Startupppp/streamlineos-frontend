import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchInput } from "./search-input";

function renderSearch(props: Partial<React.ComponentProps<typeof SearchInput>> = {}) {
  const onValueChange = jest.fn();
  const onSubmitSearch = jest.fn();
  render(
    <SearchInput
      value="ann"
      onValueChange={onValueChange}
      onSubmitSearch={onSubmitSearch}
      aria-label="Search employees"
      {...props}
    />,
  );
  return { onValueChange, onSubmitSearch, input: screen.getByLabelText("Search employees") };
}

it("calls onSubmitSearch when Enter is pressed", () => {
  const { onSubmitSearch, input } = renderSearch();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onSubmitSearch).toHaveBeenCalledTimes(1);
});

it("leaves other keys to the debounce", () => {
  const { onSubmitSearch, input } = renderSearch();
  fireEvent.keyDown(input, { key: "a" });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(onSubmitSearch).not.toHaveBeenCalled();
});

it("does not submit the enclosing form", () => {
  const onSubmit = jest.fn();
  const onSubmitSearch = jest.fn();
  render(
    <form onSubmit={onSubmit}>
      <SearchInput
        value="ann"
        onValueChange={jest.fn()}
        onSubmitSearch={onSubmitSearch}
        aria-label="Search employees"
      />
      <button type="submit">Go</button>
    </form>,
  );

  fireEvent.keyDown(screen.getByLabelText("Search employees"), { key: "Enter" });

  expect(onSubmitSearch).toHaveBeenCalledTimes(1);
  expect(onSubmit).not.toHaveBeenCalled();
});

it("still runs a caller's own onKeyDown", () => {
  const onKeyDown = jest.fn();
  const { onSubmitSearch, input } = renderSearch({ onKeyDown });
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onKeyDown).toHaveBeenCalledTimes(1);
  expect(onSubmitSearch).toHaveBeenCalledTimes(1);
});

it("owns the complete icon-only box model in compact mode", () => {
  const { input } = renderSearch({ value: "", compact: true });

  expect(input.parentElement).toHaveClass(
    "!size-9",
    "!min-w-9",
    "!max-w-9",
    "!flex-none",
    "overflow-hidden",
  );
  expect(input).toHaveClass(
    "absolute",
    "inset-0",
    "!size-9",
    "!p-0",
    "text-transparent",
  );
});

describe("SearchInput length limit hint (U-004)", () => {
  it("says the search is capped once the typed text reaches maxLength", () => {
    renderSearch({ value: "x".repeat(200), maxLength: 200 });
    expect(screen.getByRole("status")).toHaveTextContent("Search is limited to 200 characters");
  });

  it("shows no hint below the limit", () => {
    renderSearch({ value: "x".repeat(199), maxLength: 200 });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows no hint without a maxLength", () => {
    renderSearch({ value: "x".repeat(500) });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
