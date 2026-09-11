import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "./data-table";

/**
 * Sorting is server-only. `sortState` names the fields the endpoint accepts and
 * the table hands those columns a control; a table without it has no sort
 * affordance at all, which is the property the deleted `sortable` prop only
 * ever appeared to provide — it built display columns with no accessor, so
 * `getCanSort()` was false for all 234 of its declarations and the control
 * never rendered on any screen.
 */

interface SortRow {
  id: string;
  name: string;
  score: number;
}

const ROWS: SortRow[] = [
  { id: "c", name: "Charlie", score: 3 },
  { id: "a", name: "Alice", score: 1 },
  { id: "b", name: "Bob", score: 2 },
];

const COLUMNS: DataTableColumn<SortRow>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
  { key: "score", header: "Score", cell: (row) => String(row.score) },
];

function headerFor(name: string) {
  return screen.getByRole("columnheader", { name: new RegExp(name) });
}

function sortControls() {
  return screen
    .getAllByRole("columnheader")
    .flatMap((header) => [...header.querySelectorAll("button")]);
}

function firstCellTexts() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent ?? "");
}

describe("DataTable — server sort", () => {
  it("gives a control to a column the endpoint can sort by", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        sortState={{
          fields: ["name"],
          field: "name",
          direction: "asc",
          onChange: jest.fn(),
        }}
      />,
    );

    expect(headerFor("Name").querySelector("button")).not.toBeNull();
    expect(headerFor("Name")).toHaveAttribute("aria-sort", "ascending");
  });

  it("withholds the control from a column the endpoint cannot sort by", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        sortState={{
          fields: ["name"],
          field: "name",
          direction: "asc",
          onChange: jest.fn(),
        }}
      />,
    );

    expect(headerFor("Score").querySelector("button")).toBeNull();
    expect(headerFor("Score")).not.toHaveAttribute("aria-sort");
  });

  it("reports the field and direction the header was clicked into", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        sortState={{
          fields: ["name", "score"],
          field: null,
          direction: "asc",
          onChange,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Score/ }));
    expect(onChange).toHaveBeenCalledWith("score", "asc");
  });

  /**
   * Table-core removes the sort on the third click unless
   * `enableSortingRemoval` is off, which yields an empty sorting state and so
   * no field to report — the header would stop responding after two clicks.
   */
  it("keeps reporting a direction past the second click", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        sortState={{
          fields: ["name"],
          field: "name",
          direction: "desc",
          onChange,
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Name/ }));
    expect(onChange).toHaveBeenLastCalledWith("name", "asc");
  });

  it("leaves row order to the server", () => {
    render(
      <DataTable
        data={ROWS}
        columns={COLUMNS}
        getRowKey={(row) => row.id}
        sortState={{
          fields: ["name"],
          field: "name",
          direction: "asc",
          onChange: jest.fn(),
        }}
      />,
    );

    expect(firstCellTexts()).toEqual(["Charlie", "Alice", "Bob"]);
  });
});

describe("DataTable — without sortState", () => {
  it("offers no sort control on any column", () => {
    render(<DataTable data={ROWS} columns={COLUMNS} getRowKey={(row) => row.id} />);

    expect(sortControls()).toHaveLength(0);
  });

  it("renders rows in the order it was given them", () => {
    render(<DataTable data={ROWS} columns={COLUMNS} getRowKey={(row) => row.id} />);

    expect(firstCellTexts()).toEqual(["Charlie", "Alice", "Bob"]);
  });

  it("offers no sort control while loading either", () => {
    render(
      <DataTable data={ROWS} columns={COLUMNS} getRowKey={(row) => row.id} isLoading />,
    );

    expect(sortControls()).toHaveLength(0);
  });
});
