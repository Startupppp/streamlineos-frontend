import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProductProjectsToolbar, type ProductProjectsToolbarModel } from "./product-projects-toolbar";

const mockUseBuildMembers = jest.fn();
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: (...args: unknown[]) => mockUseBuildMembers(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({ filters }: { filters: { id: string; control: React.ReactNode }[] }) => (
    <div>{filters.map((f) => <div key={f.id}>{f.control}</div>)}</div>
  ),
}));

jest.mock("@/features/build/shared/build-filter-select", () => ({
  BuildFilterSelect: ({ label, value, onValueChange, options }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <select aria-label={label} value={value} onChange={(e) => onValueChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  ),
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({ ariaLabel, value, onChange }: { ariaLabel: string; value: string; onChange: (v: string) => void }) => (
    <input aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

function pageModel(): ProductProjectsToolbarModel {
  return {
    searchValue: "",
    statusValue: "",
    healthValue: "",
    teamValue: "",
    ownerValue: "",
    clientValue: "",
    contribValue: "",
    dateFromValue: "",
    dateToValue: "",
    teamOptions: [],
    clientOptions: [],
    isFiltered: false,
    searchInputRef: { current: null },
    handleSearchChange: jest.fn(),
    handleStatusChange: jest.fn(),
    handleHealthChange: jest.fn(),
    handleTeamChange: jest.fn(),
    handleOwnerChange: jest.fn(),
    handleClientChange: jest.fn(),
    handleContribChange: jest.fn(),
    handleDateFromChange: jest.fn(),
    handleDateToChange: jest.fn(),
    handleClearFilters: jest.fn(),
  };
}

beforeEach(() => {
  mockUseBuildMembers.mockReturnValue({
    data: {
      data: [
        { membershipId: 3, name: "Ada Lovelace", firstName: null, lastName: null, email: "ada@example.test" },
        { membershipId: 8, name: null, firstName: "Grace", lastName: "Hopper", email: "grace@example.test" },
      ],
    },
  });
});

it("filters by owner using the member's membership id", () => {
  const page = pageModel();
  render(<ProductProjectsToolbar page={page} />);
  expect(screen.getByRole("option", { name: "Grace Hopper" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("combobox", { name: "Owner" }), { target: { value: "3" } });
  expect(page.handleOwnerChange).toHaveBeenCalledWith("3");
  fireEvent.change(screen.getByRole("combobox", { name: "Owner" }), { target: { value: "all" } });
  expect(page.handleOwnerChange).toHaveBeenLastCalledWith("");
});

it("filters by start and end date", () => {
  const page = pageModel();
  render(<ProductProjectsToolbar page={page} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Starts from" }), { target: { value: "2026-10-01" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Ends by" }), { target: { value: "2026-12-31" } });
  expect(page.handleDateFromChange).toHaveBeenCalledWith("2026-10-01");
  expect(page.handleDateToChange).toHaveBeenCalledWith("2026-12-31");
});

it("offers only All owners when no Build members are visible", () => {
  mockUseBuildMembers.mockReturnValue({ data: undefined });
  render(<ProductProjectsToolbar page={pageModel()} />);
  const owner = screen.getByRole("combobox", { name: "Owner" });
  expect(within(owner).getAllByRole("option").map((o) => o.textContent)).toEqual(["All owners"]);
});
