import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchInput } from "./search-input";

/**
 * HRMS ticket 01/11. Debounced search boxes need an escape hatch for Enter, and
 * the search row frequently sits inside a form — so Enter must search rather
 * than submit whatever form happens to enclose it.
 */
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
