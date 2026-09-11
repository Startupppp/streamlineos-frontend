import { render, screen } from "@testing-library/react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { expectNoAxeViolations, atViewport, VIEWPORTS } from "@/test-utils";

interface Row {
  id: string;
  name: string;
  amount: number;
}

const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Name", cell: (row) => row.name, sortable: true },
  { key: "amount", header: "Amount", cell: (row) => row.amount },
];

const rows: Row[] = [
  { id: "1", name: "Acme", amount: 10 },
  { id: "2", name: "Globex", amount: 20 },
];

function renderTable(props: Partial<React.ComponentProps<typeof DataTable<Row>>> = {}) {
  return render(
    <DataTable<Row>
      data={rows}
      columns={columns}
      getRowKey={(row) => row.id}
      pagination={{ pageSize: 25 }}
      {...props}
    />,
  );
}

describe("DataTable — loading state is announced, not silent", () => {
  it("marks the skeleton region aria-busy so assistive tech knows content is pending", () => {
    const { container } = renderTable({ isLoading: true, data: [] });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it("exposes a status region naming the pending load", () => {
    renderTable({ isLoading: true, data: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Loading results");
  });

  it("renders skeleton rows shaped like the real table, not a spinner (AP-7)", () => {
    const { container } = renderTable({ isLoading: true, data: [] });
    expect(container.querySelectorAll(".animate-spin")).toHaveLength(0);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(10);
  });

  it("keeps the real column headers visible while loading so the layout does not jump", () => {
    renderTable({ isLoading: true, data: [] });
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("skeleton blocks are aria-hidden so the row count is not read out as empty cells", () => {
    const { container } = renderTable({ isLoading: true, data: [] });
    const pulses = Array.from(container.querySelectorAll(".animate-pulse"));
    expect(pulses.length).toBeGreaterThan(0);
    expect(pulses.every((el) => el.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("BITE PROOF — removing aria-busy from the loading branch leaves nothing to assert", () => {
    const { container } = renderTable({ isLoading: false });
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it("passes axe while loading", async () => {
    const { container } = renderTable({ isLoading: true, data: [] });
    await expectNoAxeViolations(container);
  });
});

describe("DataTable — empty state is announced and distinguishes its two meanings", () => {
  it("wraps the empty body in a status region so a filter change is announced", () => {
    renderTable({ data: [] });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders the caller's data-empty EmptyState with its create action", () => {
    renderTable({
      data: [],
      emptyState: (
        <EmptyState
          title="No invoices yet"
          description="Create your first invoice to get started."
          action={{ label: "New invoice", onClick: () => {} }}
        />
      ),
    });
    expect(screen.getByRole("heading", { name: "No invoices yet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New invoice" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
  });

  it("renders the filter-empty EmptyState with Clear filters and NO create action", () => {
    renderTable({
      data: [],
      emptyState: (
        <EmptyState
          title="No invoices yet"
          action={{ label: "New invoice", onClick: () => {} }}
          filtersActive
          onClearFilters={() => {}}
        />
      ),
    });
    expect(
      screen.getByRole("heading", { name: "No results match your filters." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New invoice" })).toBeNull();
  });

  it("BITE PROOF — the two empty meanings render different headings from the same props", () => {
    const props = {
      title: "No invoices yet",
      action: { label: "New invoice", onClick: () => {} },
    };
    const dataEmpty = render(<EmptyState {...props} />);
    const dataHeading = dataEmpty.container.querySelector("h2")?.textContent;
    dataEmpty.unmount();
    const filterEmpty = render(
      <EmptyState {...props} filtersActive onClearFilters={() => {}} />,
    );
    const filterHeading = filterEmpty.container.querySelector("h2")?.textContent;
    expect(dataHeading).not.toEqual(filterHeading);
  });

  it("passes axe when empty", async () => {
    const { container } = renderTable({
      data: [],
      emptyState: <EmptyState title="Nothing here" />,
    });
    await expectNoAxeViolations(container);
  });
});

describe("DataTable — permission-denied empty is a refusal, not a claim of emptiness", () => {
  it("renders the restricted state instead of the create action when the read was denied", () => {
    renderTable({
      data: [],
      emptyState: (
        <EmptyState
          title="No invoices yet"
          action={{ label: "New invoice", onClick: () => {} }}
          access={{
            permission: "accounting:receivables:read",
            allowed: false,
            denied: true,
            pending: false,
          }}
        />
      ),
    });
    expect(screen.getByRole("heading", { name: "Access Restricted" })).toBeInTheDocument();
    expect(screen.getByText("accounting:receivables:read")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New invoice" })).toBeNull();
  });
});

describe("DataTable — error state", () => {
  it("an ErrorState handed in as the empty body is announced as an alert with a retry", () => {
    const retry = jest.fn();
    renderTable({
      data: [],
      emptyState: <ErrorState onRetry={retry} />,
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});

describe("DataTable — sortable headers are keyboard-operable and expose sort order", () => {
  it("renders a real button for the sortable column so it is tab-reachable", () => {
    renderTable();
    expect(screen.getByRole("button", { name: /Name/ })).toBeInTheDocument();
  });

  it("exposes aria-sort on the header cell once sorted", () => {
    const { container } = render(
      <DataTable<Row>
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        pagination={{ pageSize: 25 }}
        sortState={{ fields: ["name"], field: "name", direction: "asc", onChange: () => {} }}
      />,
    );
    expect(container.querySelector('[aria-sort="ascending"]')).not.toBeNull();
  });
});

describe("DataTable — axe at the three reference viewports", () => {
  for (const name of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[]) {
    it(`passes axe with data at ${VIEWPORTS[name]}px`, async () => {
      const restore = atViewport(name);
      try {
        const { container } = renderTable();
        await expectNoAxeViolations(container);
      } finally {
        restore();
      }
    });
  }
});
