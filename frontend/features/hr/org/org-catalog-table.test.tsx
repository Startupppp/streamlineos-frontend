import React from "react";
import { render, screen } from "@testing-library/react";
import { OrgCatalogTable } from "./org-catalog-table";
import { ApiError } from "@/lib/api-envelope";

/**
 * Ticket 05. Job Architecture is now framed like Position Control: a `DataTable`
 * with the same toolbar shape (filter, a count, one primary action on the right),
 * a bounded page of rows, and a failure that names itself. It used to render a
 * bespoke divided card, map every row it had, and report every failure as
 * "Something went wrong".
 */
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const ROLES = [
  { id: 1, name: "Engineer", code: "ENG" },
  { id: 2, name: "Designer", code: null },
];

function renderTable(
  overrides: Partial<React.ComponentProps<typeof OrgCatalogTable>> = {},
) {
  const props = {
    title: "Job Role",
    items: ROLES,
    isLoading: false,
    isError: false,
    onRetry: jest.fn(),
    canManage: true,
    onCreate: jest.fn(),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    isCreating: false,
    isUpdating: false,
    ...overrides,
  };
  render(<OrgCatalogTable {...props} />);
  return props;
}

it("renders the rows in a table with the catalog columns", () => {
  renderTable();

  expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Code" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "Engineer" })).toBeInTheDocument();
  expect(screen.getByRole("cell", { name: "ENG" })).toBeInTheDocument();
});

it("shows the count and the single primary action", () => {
  renderTable();

  expect(screen.getByText("2 job roles")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Add job role/i })).toBeInTheDocument();
});

it("hides the create action from a viewer who cannot manage the catalog", () => {
  renderTable({ canManage: false });

  expect(screen.queryByRole("button", { name: /Add job role/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Actions for/i })).not.toBeInTheDocument();
});

it("names the failure instead of reporting it generically", () => {
  renderTable({
    isError: true,
    error: new ApiError("Job roles are unavailable while the catalog syncs", 503, "UNAVAILABLE"),
  });

  expect(
    screen.getByText("Job roles are unavailable while the catalog syncs"),
  ).toBeInTheDocument();
});

it("offers a clear-filters route from an empty search result", () => {
  renderTable({ items: [] });

  expect(screen.getByText("No job roles yet")).toBeInTheDocument();
});

it("bounds what it mounts instead of rendering every row", () => {
  const many = Array.from({ length: 45 }, (_, index) => ({
    id: index + 1,
    name: `Role ${index + 1}`,
    code: null,
  }));

  renderTable({ items: many });

  // One page of 20, not all 45 (FE-112).
  expect(screen.getAllByRole("row")).toHaveLength(21);
});
