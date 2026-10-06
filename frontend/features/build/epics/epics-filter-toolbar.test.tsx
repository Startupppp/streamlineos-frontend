import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EpicsFilterToolbar } from "./epics-filter-toolbar";
import type { BuildListFiltersState } from "@/features/build/shared/use-build-list-filters";

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({
    filters,
    onClearAll,
  }: {
    filters?: Array<{ id: string; control?: React.ReactNode }>;
    onClearAll?: () => void;
  }) => (
    <div>
      {filters?.map((f) => (
        <div key={f.id} data-testid={`filter-${f.id}`}>
          {f.control}
        </div>
      ))}
      <button type="button" data-testid="clear-all" onClick={onClearAll}>
        Clear all
      </button>
    </div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({
    label,
    onValueChange,
    options,
  }: {
    label: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <div>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-testid={`option-${label.toLowerCase()}-${opt.value}`}
          onClick={() => onValueChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  ),
}));

function makeListFilters(overrides: Partial<BuildListFiltersState> = {}) {
  return {
    search: "",
    debouncedSearch: "",
    setSearch: jest.fn(),
    value: jest.fn(() => "all"),
    isActive: jest.fn(() => false),
    setValue: jest.fn(),
    setValues: jest.fn(),
    clearAll: jest.fn(),
    activeCount: 0,
    isFiltered: false,
    cursor: null,
    setCursor: jest.fn(),
    resetKey: "",
    isPending: false,
    ...overrides,
  } satisfies BuildListFiltersState;
}

it("calls setValue with status and the chosen value when a status option is selected, which routes the update through the URL", () => {
  const listFilters = makeListFilters();
  render(
    <EpicsFilterToolbar
      listFilters={listFilters}
      searchInputRef={{ current: null }}
      projectStatuses={[{ name: "IN_PROGRESS" }, { name: "DONE" }]}
      members={[]}
    />,
  );
  fireEvent.click(screen.getByTestId("option-status-IN_PROGRESS"));
  expect(listFilters.setValue).toHaveBeenCalledWith("status", "IN_PROGRESS");
});

it("calls setValue with ownerId and the member id when an owner option is selected", () => {
  const listFilters = makeListFilters();
  render(
    <EpicsFilterToolbar
      listFilters={listFilters}
      searchInputRef={{ current: null }}
      projectStatuses={[]}
      members={[
        { id: "user-5", name: "Alex Kim", firstName: null, lastName: null },
      ]}
    />,
  );
  fireEvent.click(screen.getByTestId("option-owner-user-5"));
  expect(listFilters.setValue).toHaveBeenCalledWith("ownerId", "user-5");
});

it("calls setValue with health and the chosen value when a health option is selected", () => {
  const listFilters = makeListFilters();
  render(
    <EpicsFilterToolbar
      listFilters={listFilters}
      searchInputRef={{ current: null }}
      projectStatuses={[]}
      members={[]}
    />,
  );
  fireEvent.click(screen.getByTestId("option-health-at_risk"));
  expect(listFilters.setValue).toHaveBeenCalledWith("health", "at_risk");
});

it("calls clearAll when the clear-all control is activated", () => {
  const listFilters = makeListFilters();
  render(
    <EpicsFilterToolbar
      listFilters={listFilters}
      searchInputRef={{ current: null }}
      projectStatuses={[]}
      members={[]}
    />,
  );
  fireEvent.click(screen.getByTestId("clear-all"));
  expect(listFilters.clearAll).toHaveBeenCalled();
});

it("renders a control for each of the three declared filter ids so every param is reachable without editing the URL by hand", () => {
  const listFilters = makeListFilters();
  render(
    <EpicsFilterToolbar
      listFilters={listFilters}
      searchInputRef={{ current: null }}
      projectStatuses={[]}
      members={[]}
    />,
  );
  expect(screen.getByTestId("filter-status")).toBeInTheDocument();
  expect(screen.getByTestId("filter-ownerId")).toBeInTheDocument();
  expect(screen.getByTestId("filter-health")).toBeInTheDocument();
});
