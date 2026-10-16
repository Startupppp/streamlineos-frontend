import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { ProductProjectsToolbar, type ProductProjectsToolbarModel } from "./product-projects-toolbar";

const mockUseBuildMembers = jest.fn();
jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: (...args: unknown[]) => mockUseBuildMembers(...args),
}));

jest.mock("@/features/build/shared/build-list-toolbar", () => ({
  BuildListToolbar: ({
    filters,
    row,
  }: {
    filters: { id: string; control: React.ReactNode }[];
    row?: { desktop: number };
  }) => (
    <div data-desktop-filters={row?.desktop}>
      {filters.map((f) => <div key={f.id}>{f.control}</div>)}
    </div>
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

jest.mock("@/features/build/shared/build-multi-filter-select", () => ({
  BuildMultiFilterSelect: ({ label, values, onValuesChange, options }: {
    label: string;
    values: string[];
    onValuesChange: (v: string[]) => void;
    options: { value: string; label: string }[];
  }) => (
    <div data-testid={`multi-select-${label.toLowerCase()}`}>
      {options.map((o) => (
        <label key={o.value}>
          <input
            type="checkbox"
            aria-label={o.label}
            checked={values.includes(o.value)}
            onChange={() => {
              const next = values.includes(o.value)
                ? values.filter((v) => v !== o.value)
                : [...values, o.value];
              onValuesChange(next);
            }}
          />
          {o.label}
        </label>
      ))}
    </div>
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
    statusValue: [],
    healthValue: [],
    teamValue: "",
    ownerValue: [],
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

it("filters by owner using the member's membership id (BSN-PROJ-OWNER-MULTI)", () => {
  const page = pageModel();
  const { container } = render(<ProductProjectsToolbar page={page} />);
  expect(container.querySelector("[data-desktop-filters]")?.getAttribute("data-desktop-filters")).toBe("0");
  expect(screen.getByRole("checkbox", { name: "Grace Hopper" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Ada Lovelace" }));
  expect(page.handleOwnerChange).toHaveBeenCalledWith(["3"]);
});

it("filters by start and end date", () => {
  const page = pageModel();
  render(<ProductProjectsToolbar page={page} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Starts from" }), { target: { value: "2026-10-01" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Ends by" }), { target: { value: "2026-12-31" } });
  expect(page.handleDateFromChange).toHaveBeenCalledWith("2026-10-01");
  expect(page.handleDateToChange).toHaveBeenCalledWith("2026-12-31");
});

it("shows empty owner multi-select when no Build members are visible", () => {
  mockUseBuildMembers.mockReturnValue({ data: undefined });
  render(<ProductProjectsToolbar page={pageModel()} />);
  const ownerContainer = screen.getByTestId("multi-select-owner");
  expect(within(ownerContainer).queryAllByRole("checkbox")).toHaveLength(0);
});
