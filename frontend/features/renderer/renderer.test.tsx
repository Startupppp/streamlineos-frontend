import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import { validateLayout, type RecordLayout } from "@/lib/renderer/layout";
import { formatFieldText } from "./format-value";
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

/**
 * The engine, against a description it has never seen.
 *
 * Everything above drives the party layout, which is one record type. That
 * proves the engine renders *that*, not that it renders descriptions — and the
 * whole claim of having one engine is that the next record type needs no test of
 * its own. So this block builds a layout that exists nowhere in the product,
 * exercises every `FieldKind` through it, and asserts the engine's behaviour
 * rather than any screen's.
 *
 * If a generated screen is ever worth testing individually, this block has
 * failed at its job.
 */
const EVERY_KIND: RecordLayout = {
  key: "test:every-kind",
  singular: "Specimen",
  plural: "Specimens",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "email", label: "Email", kind: "email" },
    { name: "phone", label: "Phone", kind: "phone" },
    { name: "website", label: "Website", kind: "url" },
    { name: "quantity", label: "Quantity", kind: "number" },
    { name: "value", label: "Value", kind: "money" },
    { name: "opened", label: "Opened", kind: "date" },
    {
      name: "band",
      label: "Band",
      kind: "select",
      options: [
        { value: "a", label: "Band A", tone: "success" },
        { value: "b", label: "Band B" },
      ],
    },
    {
      name: "state",
      label: "State",
      kind: "badge",
      options: [{ value: "live", label: "Live", tone: "danger" }],
    },
    { name: "notes", label: "Notes", kind: "longText" },
    { name: "computed", label: "Computed", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search specimens…",
    columns: [
      { field: "name", primary: true, sortable: true, subtitle: "email" },
      { field: "quantity" },
      { field: "band" },
      { field: "opened", sortable: true },
    ],
  },
  detail: {
    sections: [
      { title: "Identity", fields: ["name", "email", "phone", "website"] },
      { title: "Numbers", fields: ["quantity", "value"] },
      { title: "Nothing here", fields: ["notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Identity", fields: ["name", "email", "phone", "website"] },
      { title: "Numbers", fields: ["quantity", "value", "opened"] },
      { title: "Classification", fields: ["band", "state", "notes", "computed"] },
    ],
  },
};

const specimen = {
  specimenId: "s-1",
  name: "Specimen One",
  email: "one@example.test",
  phone: "+441234567890",
  website: "example.test",
  quantity: 12,
  value: 3400,
  opened: "2026-08-01T09:00:00.000Z",
  band: "a",
  state: "live",
  notes: "A note.\nOn two lines.",
  computed: "derived",
};

const specimenKey = (row: Record<string, unknown>) => String(row.specimenId);

describe("the engine, driven by a description it has never seen", () => {
  it("accepts the description as valid", () => {
    expect(validateLayout(EVERY_KIND)).toEqual([]);
  });

  it("renders a list from it with no code written for this record type", () => {
    render(<RecordList layout={EVERY_KIND} rows={[specimen]} getRowKey={specimenKey} />);
    for (const header of ["Name", "Quantity", "Band", "Opened"])
      expect(screen.getByText(header)).toBeInTheDocument();
    // Twice: the table row and the mobile card, both derived from the same
    // description rather than written as two screens.
    expect(screen.getAllByText("Specimen One")).toHaveLength(2);
  });

  it("right-aligns and tabularises numeric kinds because the kind says so", () => {
    const { container } = render(
      <RecordList layout={EVERY_KIND} rows={[specimen]} getRowKey={specimenKey} />,
    );
    // `number` earns it from NUMERIC_KINDS, without the description asking.
    expect(container.querySelector(".tabular-nums")).not.toBeNull();
  });

  it("paints a toned option from status tokens rather than a literal colour", () => {
    const { container } = render(
      <RecordList layout={EVERY_KIND} rows={[specimen]} getRowKey={specimenKey} />,
    );
    expect(container.querySelector('[class*="status-success"]')).not.toBeNull();
  });

  it("omits a detail section whose fields are all absent from the record", () => {
    const { notes, ...withoutNotes } = specimen;
    void notes;
    render(<RecordDetail layout={EVERY_KIND} record={withoutNotes} />);
    expect(screen.getByText("Identity")).toBeInTheDocument();
    // A section of dashes tells the reader nothing and costs them a scroll.
    expect(screen.queryByText("Nothing here")).not.toBeInTheDocument();
  });

  it("produces one control per writable field, typed from the kind", () => {
    const { container } = render(<RecordForm layout={EVERY_KIND} onSubmit={jest.fn()} />);

    expect(container.querySelector('input[type="email"]')).not.toBeNull();
    expect(container.querySelector('input[type="tel"]')).not.toBeNull();
    expect(container.querySelector('input[type="url"]')).not.toBeNull();
    expect(container.querySelector('input[type="number"]')).not.toBeNull();
    expect(container.querySelector('input[type="date"]')).not.toBeNull();
    expect(container.querySelector("textarea")).not.toBeNull();
  });

  /**
   * The property `issue-record-types.ts` depends on: a read-only field is not
   * merely hidden, it is impossible to submit. That is what lets a stage be
   * moved only through its ledger.
   */
  it("refuses to render a control for a read-only field in either mode", () => {
    for (const mode of ["create", "edit"] as const) {
      const { unmount } = render(
        <RecordForm layout={EVERY_KIND} mode={mode} onSubmit={jest.fn()} />,
      );
      expect(screen.queryByLabelText("Computed")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("validates against the description rather than a schema written beside it", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={EVERY_KIND} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: "Specimen" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.submit(screen.getByRole("button", { name: /save specimen/i }));

    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects an option the description does not list, so the API never sees one", async () => {
    const onSubmit = jest.fn();
    const withBadDefault = { ...specimen, band: "z" };
    render(<RecordForm layout={EVERY_KIND} initial={withBadDefault} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole("button", { name: /save specimen/i }));

    expect(await screen.findByText(/Choose one of the listed band/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  /**
   * `money` was a `FieldKind` the engine accepted and did not implement: it fell
   * through to a raw number, so every CRM record type carrying an amount — a
   * quote, a deal, a campaign budget — could not move onto the engine without
   * losing its currency. The tenant's own currency, never a hardcoded symbol.
   */
  it("formats a money field in the organisation's currency", () => {
    render(
      <RecordDetail
        layout={EVERY_KIND}
        record={specimen}
        money={{ currency: "GBP", locale: "en-GB" }}
      />,
    );
    // The tenant's currency, not a symbol hardcoded in a screen or in the engine.
    expect(screen.getByText("£3,400.00")).toBeInTheDocument();
  });

  it("falls back to the documented default when no currency is supplied", () => {
    render(<RecordDetail layout={EVERY_KIND} record={specimen} />);
    expect(screen.getByText(/3,400/)).toBeInTheDocument();
  });

  it("leaves an unparseable amount alone rather than rendering a confident zero", () => {
    const money = EVERY_KIND.fields.find((field) => field.name === "value");
    expect(money).toBeDefined();
    if (money) expect(formatFieldText(money, "n/a")).toBe("n/a");
  });

  it("names its own empty and search copy from the description", () => {
    expect(EVERY_KIND.list.searchPlaceholder).toContain("specimens");
    // The singular reaches the submit button without a screen supplying a label.
    render(<RecordForm layout={EVERY_KIND} onSubmit={jest.fn()} />);
    expect(screen.getByRole("button", { name: /save specimen/i })).toBeInTheDocument();
  });
});
