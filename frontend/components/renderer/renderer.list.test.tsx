import { fireEvent, render, screen } from "@testing-library/react";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { validateLayout, type RecordLayout } from "@/lib/renderer/layout";
import { RecordList } from "./record-list";
import { ShellVariantProvider } from "@/components/layout/shell-variant-context";

const rows = [
  {
    partyId: "p-1",
    name: "Acme Trading",
    partyType: "CUSTOMER",
    status: "active",
    email: "ops@acme.example",
    phone: "+441234567890",
    createdAt: "2026-08-01T09:00:00.000Z",
  },
  {
    partyId: "p-2",
    name: "Globex",
    partyType: "VENDOR",
    status: "blocked",
    email: "",
    phone: "",
    createdAt: "2026-08-02T09:00:00.000Z",
  },
];

const key = (row: Record<string, unknown>) => String(row.partyId);

describe("the party layout", () => {
  it("refers to nothing it does not define", () => {
    expect(validateLayout(PARTY_LAYOUT)).toEqual([]);
  });

  it("catches a description that would render an empty column", () => {
    const broken: RecordLayout = {
      ...PARTY_LAYOUT,
      list: { ...PARTY_LAYOUT.list, columns: [{ field: "nope", primary: true }] },
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ message: 'unknown field "nope"' }),
    );
  });

  it("catches a list with no primary column, which would leave the mobile card untitled", () => {
    const broken: RecordLayout = {
      ...PARTY_LAYOUT,
      list: { ...PARTY_LAYOUT.list, columns: [{ field: "email" }] },
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "list.columns" }),
    );
  });
});

describe("RecordList", () => {
  it("renders a column per the description, labelled from the field spec", () => {
    render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    for (const label of ["Name", "Type", "Email", "Phone", "Added"]) {
      expect(screen.getByRole("columnheader", { name: label })).toBeInTheDocument();
    }
  });

  it("drives the one platform table rather than shipping a second one", () => {
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("supplies a mobile card with a touch target past the 44px guidance", () => {
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.innerHTML).toContain("min-h-11");
  });

  it("takes card padding from the density tokens", () => {
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.innerHTML).toContain("p-card-pad");
  });

  it("right-aligns and tabularises a numeric column without the screen asking", () => {
    const withNumber = {
      ...PARTY_LAYOUT,
      fields: [...PARTY_LAYOUT.fields, { name: "balance", label: "Balance", kind: "money" as const }],
      list: { ...PARTY_LAYOUT.list, columns: [...PARTY_LAYOUT.list.columns, { field: "balance" }] },
    };
    const { container } = render(
      <RecordList layout={withNumber} rows={[{ ...rows[0], balance: 42 }]} getRowKey={key} />,
    );
    expect(container.innerHTML).toContain("tabular-nums");
  });

  it("paints a status from tokens rather than a literal, so dark mode comes free", () => {
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.innerHTML).toContain("bg-status-success-surface");
    expect(container.innerHTML).toContain("bg-status-info-surface");
    expect(container.innerHTML).not.toMatch(/emerald-\d{2,3}/);
  });

  it("renders the described subtitle under the primary column", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={[{ ...rows[0], legalName: "Acme Trading Ltd" }]}
        getRowKey={key}
      />,
    );
    expect(screen.getAllByText("Acme Trading Ltd").length).toBeGreaterThan(0);
  });

  it("appends a screen-supplied actions column without it being in the description", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={rows}
        getRowKey={key}
        actions={(row) => <button type="button">Edit {String(row.name)}</button>}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Edit Globex" }).length).toBeGreaterThan(0);
  });

  it("shows a dash for an empty value instead of a blank cell", () => {
    render(<RecordList layout={PARTY_LAYOUT} rows={[rows[1]!]} getRowKey={key} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("makes an email actionable rather than inert text", () => {
    render(<RecordList layout={PARTY_LAYOUT} rows={[rows[0]!]} getRowKey={key} />);
    expect(screen.getAllByRole("link", { name: "ops@acme.example" })[0]).toHaveAttribute(
      "href",
      "mailto:ops@acme.example",
    );
  });

  it("reports a row click with the row that was clicked", () => {
    const onRowClick = jest.fn();
    render(
      <RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} onRowClick={onRowClick} />,
    );

    fireEvent.click(screen.getAllByText("Globex")[0]!);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("shows the empty state rather than an empty table", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={[]}
        getRowKey={key}
        emptyState={<p>No parties yet</p>}
      />,
    );
    expect(screen.getByText("No parties yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows the platform skeleton while loading, not an empty table", () => {
    const { container } = render(
      <RecordList layout={PARTY_LAYOUT} rows={[]} getRowKey={key} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText("Acme Trading")).not.toBeInTheDocument();
  });

  it("survives a description naming a field the record does not carry", () => {
    const stale: RecordLayout = {
      ...PARTY_LAYOUT,
      list: { ...PARTY_LAYOUT.list, columns: [...PARTY_LAYOUT.list.columns, { field: "ghost" }] },
    };
    expect(() => render(<RecordList layout={stale} rows={rows} getRowKey={key} />)).not.toThrow();
  });
});

describe("the row controls a description does not own", () => {
  it("puts a screen-supplied leading control before the described columns", () => {
    const { container } = render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={rows}
        getRowKey={key}
        leading={() => <input type="checkbox" aria-label="Done" />}
      />,
    );
    const firstCell = container.querySelector("tbody tr td");
    expect(firstCell?.querySelector("input[type=checkbox]")).not.toBeNull();
  });

  it("keeps a leading control and a trailing action on the same row without either displacing a column", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={rows}
        getRowKey={key}
        leading={() => <input type="checkbox" aria-label="Done" />}
        actions={() => <button type="button">More</button>}
      />,
    );
    expect(screen.getAllByLabelText("Done")).toHaveLength(rows.length * 2);
    expect(screen.getAllByRole("button", { name: "More" })).toHaveLength(rows.length * 2);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });
});

describe("the mobile card", () => {
  it("carries the row's leading control, so a phone can still act on a row", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={[rows[0]]}
        getRowKey={key}
        leading={() => <input type="checkbox" aria-label="Done" />}
      />,
    );
    expect(screen.getAllByLabelText("Done")).toHaveLength(2);
  });

  it("carries the row's actions too", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={[rows[0]]}
        getRowKey={key}
        actions={() => <button type="button">More</button>}
      />,
    );
    expect(screen.getAllByRole("button", { name: "More" })).toHaveLength(2);
  });

  it("still titles itself from the primary column", () => {
    render(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={[rows[0]]}
        getRowKey={key}
        leading={() => <input type="checkbox" aria-label="Done" />}
      />,
    );
    expect(screen.getAllByText("Acme Trading").length).toBeGreaterThan(0);
  });
});

describe("RecordList — mobile shell variant", () => {
  function renderMobile(ui: React.ReactElement) {
    return render(
      <ShellVariantProvider variant="mobile">{ui}</ShellVariantProvider>,
    );
  }

  it("renders exactly as many cards as rows and no table element", () => {
    const { container } = renderMobile(
      <RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />,
    );
    expect(container.querySelector("table")).toBeNull();
    const cards = container.querySelectorAll('[class*="rounded-lg border border-border bg-card"]');
    expect(cards).toHaveLength(rows.length);
  });

  it("still carries the row actions on each card", () => {
    renderMobile(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={rows}
        getRowKey={key}
        actions={() => <button type="button">Edit</button>}
      />,
    );
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(rows.length);
  });

  it("calls onRowClick with the clicked row", () => {
    const onRowClick = jest.fn();
    renderMobile(
      <RecordList
        layout={PARTY_LAYOUT}
        rows={rows}
        getRowKey={key}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getAllByText("Globex")[0]!);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("supplies a touch target meeting the 44px guidance", () => {
    const { container } = renderMobile(
      <RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />,
    );
    expect(container.innerHTML).toContain("min-h-11");
  });
});
