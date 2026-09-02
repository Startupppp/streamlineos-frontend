import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

interface Row {
  id: string;
  name: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (row) => row.name },
];

function makeRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r${i}`,
    name: `Row ${i}`,
  }));
}

function bodyRowCount(container: HTMLElement): number {
  return container.querySelectorAll("tbody tr").length;
}

describe("DataTable — a caller that omits `pagination` must not lose rows", () => {
  it("keeps the mounted row count bounded rather than mounting the whole collection", () => {
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(bodyRowCount(container)).toBe(50);
  });

  it("exposes a pagination control so the windowed-away rows stay reachable", () => {
    render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "Pagination" }),
    ).toBeInTheDocument();
  });

  it("reaches the final row of the collection through that control", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    const body = container.querySelector("tbody");
    expect(body).not.toBeNull();
    if (!body) return;
    expect(within(body).queryByText("Row 179")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(within(body).getByText("Row 179")).toBeInTheDocument();
  });

  it("walks every row of the collection across its pages, with no gap and no repeat", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    const body = container.querySelector("tbody");
    expect(body).not.toBeNull();
    if (!body) return;
    const seen: string[] = [];
    for (let page = 0; page < 4; page += 1) {
      body.querySelectorAll("tr").forEach((tr) => seen.push(tr.textContent ?? ""));
      if (page < 3) await user.click(screen.getByRole("button", { name: "Next page" }));
    }
    expect(seen).toHaveLength(180);
    expect(new Set(seen).size).toBe(180);
    expect(seen[0]).toBe("Row 0");
    expect(seen[179]).toBe("Row 179");
  });

  it("still honours an explicit client page size", () => {
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
      />,
    );
    expect(bodyRowCount(container)).toBe(25);
  });

  it("adds no pagination control to a collection that fits in one window", () => {
    render(
      <DataTable<Row>
        data={makeRows(12)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });
});

describe("DataTable — a filter that shrinks the data must not strand the reader on a dead page", () => {
  it("clamps a stale client page index instead of rendering an empty table", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByText("Row 179")).toBeInTheDocument();

    rerender(
      <DataTable<Row>
        data={makeRows(10)}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
      />,
    );
    expect(bodyRowCount(container)).toBe(10);
    expect(screen.getByText("Row 0")).toBeInTheDocument();
  });
});

describe("DataTable — windowed rows keep honest row semantics", () => {
  it("reports the full collection size via aria-rowcount, not the page size", () => {
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
      />,
    );
    const table = container.querySelector("table[aria-rowcount]");
    expect(table?.getAttribute("aria-rowcount")).toBe("181");
  });

  it("gives each rendered row its position within the whole collection", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
      />,
    );
    expect(
      container.querySelector("tbody tr")?.getAttribute("aria-rowindex"),
    ).toBe("2");
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(
      container.querySelector("tbody tr")?.getAttribute("aria-rowindex"),
    ).toBe("27");
  });
});

/**
 * Cursor-paginated pages (`CursorPageControls` beside a `DataTable`) hand the
 * table ONE server page at a time and own the paging themselves. The internal
 * window must stay invisible to them: a second pager over a cursor page would
 * let the reader page inside a page, and the two controls would disagree about
 * where they are.
 */
describe("DataTable — a cursor-paginated caller keeps exactly one pager", () => {
  it("adds no internal pager to a single cursor page", () => {
    render(
      <DataTable<Row>
        data={makeRows(20)}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("shows the next cursor page from its first row, skipping and repeating nothing", () => {
    const pageOne = Array.from({ length: 20 }, (_, i) => ({
      id: `a${i}`,
      name: `Row ${i}`,
    }));
    const pageTwo = Array.from({ length: 20 }, (_, i) => ({
      id: `b${i}`,
      name: `Row ${20 + i}`,
    }));
    const { container, rerender } = render(
      <DataTable<Row>
        data={pageOne}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    const readRows = () =>
      Array.from(container.querySelectorAll("tbody tr")).map((tr) => tr.textContent);

    expect(readRows()).toEqual(pageOne.map((r) => r.name));
    rerender(
      <DataTable<Row>
        data={pageTwo}
        columns={columns}
        getRowKey={(row) => row.id}
      />,
    );
    const shown = readRows();
    expect(shown).toEqual(pageTwo.map((r) => r.name));
    expect(shown.some((name) => pageOne.some((r) => r.name === name))).toBe(false);
  });

  it("returns to the first row when a sort changes the order under the reader", async () => {
    const user = userEvent.setup();
    const sortableColumns: DataTableColumn<Row>[] = [
      { key: "name", header: "Name", cell: (row) => row.name, sortable: true },
    ];
    const { container } = render(
      <DataTable<Row>
        data={makeRows(180)}
        columns={sortableColumns}
        getRowKey={(row) => row.id}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(container.querySelector("tbody tr")?.getAttribute("aria-rowindex")).toBe("152");

    await user.click(screen.getByRole("button", { name: "Sort by Name" }));
    expect(container.querySelector("tbody tr")?.getAttribute("aria-rowindex")).toBe("2");
  });
});
