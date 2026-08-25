import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { validateLayout, type RecordLayout } from "@/lib/renderer/layout";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

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
    // CLAUDE.md is explicit that there is exactly one DataTable; the engine
    // supplies its columns, it does not replace it.
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("supplies a mobile card with a touch target past the 44px guidance", () => {
    const { container } = render(<RecordList layout={PARTY_LAYOUT} rows={rows} getRowKey={key} />);
    expect(container.innerHTML).toContain("min-h-11");
  });

  it("takes card padding from the density tokens", () => {
    // The comfortable/compact switch is a document attribute, not a rewrite.
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
    // Customer is a success tone, vendor an info tone, both from the token layer.
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
    // A stale layout should cost one column, not the screen.
    const stale: RecordLayout = {
      ...PARTY_LAYOUT,
      list: { ...PARTY_LAYOUT.list, columns: [...PARTY_LAYOUT.list.columns, { field: "ghost" }] },
    };
    expect(() => render(<RecordList layout={stale} rows={rows} getRowKey={key} />)).not.toThrow();
  });
});

describe("RecordDetail", () => {
  it("groups fields into the sections the description declares", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[0]!} />);
    expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contact" })).toBeInTheDocument();
  });

  it("titles the record from the field the description nominates", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[0]!} />);
    expect(screen.getByRole("heading", { level: 1, name: "Acme Trading" })).toBeInTheDocument();
  });

  it("omits a section whose fields are all empty, rather than showing rows of dashes", () => {
    render(<RecordDetail layout={PARTY_LAYOUT} record={rows[1]!} />);
    expect(screen.queryByRole("heading", { name: "Contact" })).not.toBeInTheDocument();
  });
});

describe("RecordForm", () => {
  it("renders a control per field, typed from the description", () => {
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(/^Website/)).toHaveAttribute("type", "url");
    expect(screen.getAllByRole("combobox").length).toBeGreaterThan(0);
  });

  it("uses the platform form primitives rather than bespoke controls", () => {
    // CLAUDE.md §4: react-hook-form + the shared Form primitives, always.
    const { container } = render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    expect(container.querySelectorAll("[data-slot='form-item']").length).toBeGreaterThan(0);
  });

  it("refuses to submit while a required field is empty, and says which", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    // The message comes from the schema the description generated, not from a
    // string typed into this screen.
    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed email against the schema the description generated", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: "not-an-email" } });
    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values once the required fields are filled", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Initech" } });
    fireEvent.submit(screen.getByRole("button", { name: /save party/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Initech" }),
        expect.anything(),
      ),
    );
  });

  it("prefills from an existing record when editing", () => {
    render(<RecordForm layout={PARTY_LAYOUT} initial={rows[0]} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/^Name/)).toHaveValue("Acme Trading");
  });

  it("associates every control with its label", () => {
    render(<RecordForm layout={PARTY_LAYOUT} onSubmit={jest.fn()} />);
    for (const label of [/^Name/, /^Legal name/, /^Email/, /^Phone/]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });
});

describe("RecordForm create vs edit", () => {
  /**
   * `status` is `editOnly` in PARTY_LAYOUT because `createPartySchema` has no
   * such key. Rendering it on a create form offers a control whose value the API
   * silently drops — a form that appears to work and does not.
   */
  it("omits an edit-only field when creating", () => {
    render(
      <RecordForm layout={PARTY_LAYOUT} mode="create" onSubmit={jest.fn()} />,
    );
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
  });

  it("includes it when editing", () => {
    render(
      <RecordForm layout={PARTY_LAYOUT} mode="edit" onSubmit={jest.fn()} />,
    );
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
  });

  it("renders the fields the hand-written form had forgotten", () => {
    // The form this replaced never gained displayName or notes, both of which
    // the API has always accepted. Two descriptions of one record drift.
    render(<RecordForm layout={PARTY_LAYOUT} mode="create" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText("Display name")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
  });
});
