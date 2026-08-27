import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PARTY_LAYOUT } from "@/lib/renderer/party-layout";
import {
  toneForSignedValue,
  validateLayout,
  type RecordLayout,
} from "@/lib/renderer/layout";
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
        // A record with no repeating group submits an empty rows map, not
        // nothing: a caller reading `lines.items` should never see undefined
        // because this layout happens to have none.
        {},
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

/**
 * The vocabulary the remaining record types needed.
 *
 * Each of these was found the same way the campaign surface found `sign`: a
 * hand-written screen did something a description could not say, so migrating it
 * would have lost the behaviour. They are asserted against a description the
 * engine has never seen, not against the screens that motivated them.
 */
const OWN_CURRENCY: RecordLayout = {
  key: "test:own-currency",
  singular: "Order",
  plural: "Orders",
  titleField: "reference",
  fields: [
    { name: "reference", label: "Reference", kind: "text", required: true },
    { name: "currency", label: "Currency", kind: "text", readOnly: true },
    { name: "net", label: "Net", kind: "money", readOnly: true, currencyField: "currency" },
    { name: "fee", label: "Fee", kind: "money", readOnly: true },
    { name: "due", label: "Due", kind: "dateTime" },
    { name: "ownerId", label: "Owner", kind: "reference", referenceTo: "member" },
  ],
  list: {
    searchPlaceholder: "Search orders…",
    columns: [
      { field: "reference", primary: true },
      { field: "net" },
      { field: "fee" },
    ],
  },
  detail: { sections: [{ title: "Money", fields: ["net", "fee"] }] },
  form: { sections: [{ title: "Order", fields: ["reference", "due", "ownerId"] }] },
};

const order = { orderId: "o-1", reference: "SO-1", currency: "USD", net: 1200, fee: 50, due: "2026-09-01T15:30:00.000Z", ownerId: "u-9" };
const orderKey = (row: Record<string, unknown>) => String(row.orderId);

describe("a record that carries its own currency", () => {
  it("accepts the description", () => {
    expect(validateLayout(OWN_CURRENCY)).toEqual([]);
  });

  it("renders the amount in the record's currency, not the organisation's", () => {
    render(
      <RecordList
        layout={OWN_CURRENCY}
        rows={[order]}
        getRowKey={orderKey}
        money={{ currency: "INR", locale: "en-IN" }}
      />,
    );
    // What matters is that it is dollars and not the tenant's rupees.
    const shown = screen.getAllByText((text) => text.includes("1,200.00"));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.some((node) => node.textContent?.includes("₹"))).toBe(false);
  });

  it("leaves a money field with no declared currency on the organisation's own", () => {
    render(
      <RecordList
        layout={OWN_CURRENCY}
        rows={[order]}
        getRowKey={orderKey}
        money={{ currency: "GBP", locale: "en-GB" }}
      />,
    );
    expect(screen.getAllByText("£50.00").length).toBeGreaterThan(0);
  });

  it("falls back to the organisation's currency when the record's is not a code", () => {
    render(
      <RecordDetail
        layout={OWN_CURRENCY}
        record={{ ...order, currency: "" }}
        money={{ currency: "GBP", locale: "en-GB" }}
      />,
    );
    expect(screen.getByText("£1,200.00")).toBeInTheDocument();
  });

  it("reports a currencyField that names nothing, rather than rendering the wrong symbol", () => {
    const broken: RecordLayout = {
      ...OWN_CURRENCY,
      fields: OWN_CURRENCY.fields.map((field) =>
        field.name === "net" ? { ...field, currencyField: "notAField" } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (net).currencyField" }),
    );
  });

  it("reports a currencyField on a field that carries no amount", () => {
    const broken: RecordLayout = {
      ...OWN_CURRENCY,
      fields: OWN_CURRENCY.fields.map((field) =>
        field.name === "reference" ? { ...field, currencyField: "currency" } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (reference)" }),
    );
  });
});

describe("a moment rather than a day", () => {
  it("renders a dateTime with its time, which a date field would drop", () => {
    const due = OWN_CURRENCY.fields.find((field) => field.name === "due");
    expect(due).toBeDefined();
    if (due) expect(formatFieldText(due, order.due)).toMatch(/\d{1,2}:\d{2}/);
  });

  it("gives the form a control that can carry a time", () => {
    const { container } = render(<RecordForm layout={OWN_CURRENCY} onSubmit={jest.fn()} />);
    expect(container.querySelector('input[type="datetime-local"]')).not.toBeNull();
  });
});

describe("a field that points at another record", () => {
  it("renders the control the surface supplies rather than a box for an id", () => {
    render(
      <RecordForm
        layout={OWN_CURRENCY}
        onSubmit={jest.fn()}
        controls={{
          ownerId: ({ value }) => <button type="button">Pick owner ({value || "none"})</button>,
        }}
      />,
    );
    expect(screen.getByRole("button", { name: /pick owner/i })).toBeInTheDocument();
  });

  it("hands the supplied control the field's value and a way to change it", async () => {
    const onSubmit = jest.fn();
    render(
      <RecordForm
        layout={OWN_CURRENCY}
        initial={{ reference: "SO-1" }}
        onSubmit={onSubmit}
        controls={{
          ownerId: ({ onChange }) => (
            <button type="button" onClick={() => onChange("u-42")}>
              Choose
            </button>
          ),
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /choose/i }));
    fireEvent.click(screen.getByRole("button", { name: /save order/i }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: "u-42" }),
        expect.anything(),
        {},
      ),
    );
  });

  it("degrades to a text input when no control is supplied, rather than dropping the field", () => {
    render(<RecordForm layout={OWN_CURRENCY} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText("Owner")).toBeInTheDocument();
  });
});

/**
 * Sign-dependent tone, asserted on the engine rather than on a campaign.
 *
 * This is the vocabulary that unblocked the surfaces Phase 1 could not move: a
 * hand-written screen painted ROI green above zero and red below with its own
 * colour helper, and no description could say it, so migrating the screen would
 * have lost the colour. The description now states which direction is good news
 * and the engine decides what good news looks like — so the rule is tested once,
 * here, against a layout no screen uses.
 */
const SIGNED: RecordLayout = {
  key: "test:signed",
  singular: "Result",
  plural: "Results",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    { name: "roi", label: "ROI", kind: "percent", sign: "gain" },
    { name: "variance", label: "Variance", kind: "money", sign: "gain" },
    { name: "daysLate", label: "Days late", kind: "number", sign: "cost" },
    { name: "quantity", label: "Quantity", kind: "number" },
  ],
  list: {
    searchPlaceholder: "Search results…",
    columns: [
      { field: "name", primary: true },
      { field: "roi" },
      { field: "variance" },
      { field: "daysLate" },
      { field: "quantity" },
    ],
  },
  detail: { sections: [{ title: "Return", fields: ["roi", "daysLate"] }] },
  form: { sections: [{ title: "Return", fields: ["name", "roi", "quantity"] }] },
};

const signedKey = (row: Record<string, unknown>) => String(row.name);

/**
 * Every class on every span carrying exactly this text.
 *
 * Joined rather than taken from the first match, because a list renders each
 * value twice — once in the table row and once in the mobile card — and the
 * card wraps the toned value in a quieter span of its own. Asserting on the
 * first span found would be asserting on whichever of the two the table happens
 * to emit first.
 */
function toneOf(container: HTMLElement, text: string): string {
  return [...container.querySelectorAll("span")]
    .filter((candidate) => candidate.textContent === text)
    .map((candidate) => candidate.className)
    .join(" ");
}

describe("a description that says which direction is good news", () => {
  it("is accepted, because sign sits on numeric kinds", () => {
    expect(validateLayout(SIGNED)).toEqual([]);
  });

  it("reports a sign on a field that has no sign to read", () => {
    const broken: RecordLayout = {
      ...SIGNED,
      fields: SIGNED.fields.map((field) =>
        field.name === "name" ? { ...field, sign: "gain" as const } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (name)" }),
    );
  });

  it("resolves the tone from the description alone, with nothing rendered", () => {
    const gain = SIGNED.fields.find((field) => field.name === "roi")!;
    const cost = SIGNED.fields.find((field) => field.name === "daysLate")!;
    const plain = SIGNED.fields.find((field) => field.name === "quantity")!;

    expect(toneForSignedValue(gain, 12.4)).toBe("success");
    expect(toneForSignedValue(gain, -3)).toBe("danger");
    expect(toneForSignedValue(gain, 0)).toBe("neutral");
    expect(toneForSignedValue(cost, 4)).toBe("danger");
    expect(toneForSignedValue(cost, -4)).toBe("success");
    // A number that is arithmetic rather than a verdict earns no tone at all.
    expect(toneForSignedValue(plain, -99)).toBeUndefined();
  });

  it("refuses a tone for a value it could not read, rather than colouring a guess", () => {
    const gain = SIGNED.fields.find((field) => field.name === "roi")!;
    expect(toneForSignedValue(gain, "n/a")).toBeUndefined();
    expect(toneForSignedValue(gain, "")).toBeUndefined();
    expect(toneForSignedValue(gain, null)).toBeUndefined();
  });

  it("paints a favourable figure from the success token and an unfavourable one from danger", () => {
    const { container } = render(
      <RecordList
        layout={SIGNED}
        rows={[{ name: "Up", roi: 12.4, variance: 500, daysLate: 3, quantity: -9 }]}
        getRowKey={signedKey}
      />,
    );
    expect(toneOf(container, "12.4%")).toContain("status-success");
    expect(toneOf(container, "3")).toContain("status-danger");
  });

  it("inverts the tone for a field whose sign is a cost rather than a gain", () => {
    const { container } = render(
      <RecordList
        layout={SIGNED}
        rows={[{ name: "Early", roi: -8, daysLate: -2, quantity: 1 }]}
        getRowKey={signedKey}
      />,
    );
    expect(toneOf(container, "-8%")).toContain("status-danger");
    expect(toneOf(container, "-2")).toContain("status-success");
  });

  it("leaves a number the description did not call a verdict untinted", () => {
    const { container } = render(
      <RecordList
        layout={SIGNED}
        rows={[{ name: "Plain", roi: 1, quantity: -9 }]}
        getRowKey={signedKey}
      />,
    );
    expect(toneOf(container, "-9")).not.toContain("status-");
  });

  it("keeps the minus sign, so colour is never the only thing telling the two apart", () => {
    render(
      <RecordList layout={SIGNED} rows={[{ name: "Down", roi: -12.5 }]} getRowKey={signedKey} />,
    );
    expect(screen.getAllByText("-12.5%").length).toBeGreaterThan(0);
  });

  it("tones the detail view from the same description that toned the list", () => {
    const { container } = render(
      <RecordDetail layout={SIGNED} record={{ name: "Up", roi: 4, daysLate: 2 }} />,
    );
    expect(toneOf(container, "4%")).toContain("status-success");
    expect(toneOf(container, "2")).toContain("status-danger");
  });

  it("formats a percent as the API stores it, without inventing decimals", () => {
    const roi = SIGNED.fields.find((field) => field.name === "roi")!;
    expect(formatFieldText(roi, 12.4)).toBe("12.4%");
    // Not Intl's `style: "percent"`, which would render this as 6,000%.
    expect(formatFieldText(roi, 60)).toBe("60%");
    expect(formatFieldText(roi, "n/a")).toBe("n/a");
    expect(formatFieldText(roi, null)).toBe("");
  });

  it("right-aligns a percent because the kind is numeric, without the description asking", () => {
    const { container } = render(
      <RecordList layout={SIGNED} rows={[{ name: "Up", roi: 4 }]} getRowKey={signedKey} />,
    );
    expect(container.querySelector(".tabular-nums")).not.toBeNull();
  });

  it("renders a percent as a number control on the generated form", () => {
    render(<RecordForm layout={SIGNED} onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/ROI/)).toHaveAttribute("type", "number");
  });
});

/**
 * A flag, which is a two-option field with a switch instead of a dropdown.
 *
 * `isActive`, `isPrimary`, `isDefault`, `isRequired` — the CRM settings records
 * are full of them, and their absence from the vocabulary is what stopped
 * several of those forms moving onto the engine. It reuses `options` rather than
 * growing a `trueLabel`, because "Active / Inactive" is the same shape as any
 * other pair of options and a second way to say it would be a second thing to
 * keep in step.
 */
const FLAGGED: RecordLayout = {
  key: "test:flagged",
  singular: "Rule",
  plural: "Rules",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    {
      name: "isActive",
      label: "Active",
      kind: "boolean",
      options: [
        { value: "true", label: "Active", tone: "success" },
        { value: "false", label: "Inactive", tone: "neutral" },
      ],
    },
    { name: "isDefault", label: "Default", kind: "boolean" },
  ],
  list: {
    searchPlaceholder: "Search rules…",
    columns: [
      { field: "name", primary: true },
      { field: "isActive" },
      { field: "isDefault" },
    ],
  },
  detail: { sections: [{ title: "Rule", fields: ["name", "isActive", "isDefault"] }] },
  form: { sections: [{ title: "Rule", fields: ["name", "isActive", "isDefault"] }] },
};

const flagKey = (row: Record<string, unknown>) => String(row.name);

describe("a boolean field", () => {
  it("is a valid description", () => {
    expect(validateLayout(FLAGGED)).toEqual([]);
  });

  it("renders the description's own words rather than true and false", () => {
    const active = FLAGGED.fields.find((field) => field.name === "isActive")!;
    expect(formatFieldText(active, true)).toBe("Active");
    expect(formatFieldText(active, false)).toBe("Inactive");
  });

  it("falls back to yes and no when the description names no options", () => {
    const fallback = FLAGGED.fields.find((field) => field.name === "isDefault")!;
    expect(formatFieldText(fallback, true)).toBe("Yes");
    expect(formatFieldText(fallback, false)).toBe("No");
  });

  it("treats false as a value and only null as nothing", () => {
    const fallback = FLAGGED.fields.find((field) => field.name === "isDefault")!;
    expect(formatFieldText(fallback, false)).toBe("No");
    expect(formatFieldText(fallback, null)).toBe("");
    expect(formatFieldText(fallback, undefined)).toBe("");
  });

  it("shows a dash for an unknown flag rather than claiming it is off", () => {
    render(
      <RecordList layout={FLAGGED} rows={[{ name: "One", isDefault: null }]} getRowKey={flagKey} />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("paints a toned flag from the status tokens, like any other two-option field", () => {
    const { container } = render(
      <RecordList
        layout={FLAGGED}
        rows={[{ name: "One", isActive: true, isDefault: false }]}
        getRowKey={flagKey}
      />,
    );
    expect(toneOf(container, "Active")).toContain("status-success");
  });

  it("gives the form a switch rather than a two-item dropdown", () => {
    render(<RecordForm layout={FLAGGED} onSubmit={jest.fn()} />);
    expect(screen.getByRole("switch", { name: "Active" })).toBeInTheDocument();
  });

  it("defaults an absent flag to off rather than to a value its own schema rejects", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={FLAGGED} initial={{ name: "One" }} onSubmit={onSubmit} />);
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ isActive: "false", isDefault: "false" });
  });

  it("carries the switch's state back as the string every other control uses", async () => {
    const onSubmit = jest.fn();
    render(<RecordForm layout={FLAGGED} initial={{ name: "One" }} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("switch", { name: "Active" }));
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ isActive: "true" });
  });

  it("prefills from an existing record", () => {
    render(
      <RecordForm layout={FLAGGED} initial={{ name: "One", isActive: true }} onSubmit={jest.fn()} />,
    );
    expect(screen.getByRole("switch", { name: "Active" })).toBeChecked();
  });
});

/**
 * A pointer at another record, rendered as a way to get there.
 *
 * `referenceTo` reached the form long before it reached the page: a surface
 * supplied a picker, and the rendered value stayed an identifier. So a quote's
 * deal and its client had to be a hand-written card beside the generated detail
 * view — describing them would have silently cost the navigation, which is the
 * kind of forced migration that loses a capability.
 */
const POINTING: RecordLayout = {
  key: "test:pointing",
  singular: "Note",
  plural: "Notes",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    { name: "dealId", label: "Deal", kind: "reference", referenceTo: "deal", referenceLabel: "dealTitle" },
    { name: "dealTitle", label: "Deal name", kind: "text", readOnly: true },
    { name: "ownerId", label: "Owner", kind: "reference", referenceTo: "member" },
    { name: "plainId", label: "Plain", kind: "reference", referenceTo: "deal" },
  ],
  list: {
    searchPlaceholder: "Search notes…",
    columns: [
      { field: "title", primary: true },
      { field: "dealId" },
      { field: "ownerId" },
    ],
  },
  detail: { sections: [{ title: "Note", fields: ["title", "dealId", "ownerId", "plainId"] }] },
  form: { sections: [{ title: "Note", fields: ["title", "dealId"] }] },
};

const pointingKey = (row: Record<string, unknown>) => String(row.title);

describe("a reference on a rendered surface", () => {
  it("is a valid description", () => {
    expect(validateLayout(POINTING)).toEqual([]);
  });

  it("links to the record it points at, named by the sibling the description nominates", () => {
    render(
      <RecordDetail
        layout={POINTING}
        record={{ title: "One", dealId: 42, dealTitle: "Acme renewal" }}
      />,
    );
    const link = screen.getByRole("link", { name: "Acme renewal" });
    expect(link).toHaveAttribute("href", "/crm/deals/42");
  });

  it("shows the identifier when the read sent no name for it", () => {
    render(<RecordDetail layout={POINTING} record={{ title: "One", plainId: 7 }} />);
    expect(screen.getByRole("link", { name: "7" })).toHaveAttribute("href", "/crm/deals/7");
  });

  it("renders a domain the product has no page for as plain text, not a link to nowhere", () => {
    render(<RecordDetail layout={POINTING} record={{ title: "One", ownerId: "u-1" }} />);
    expect(screen.getByText("u-1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "u-1" })).toBeNull();
  });

  it("links from a list cell as well as a detail view", () => {
    render(
      <RecordList
        layout={POINTING}
        rows={[{ title: "One", dealId: 42, dealTitle: "Acme renewal" }]}
        getRowKey={pointingKey}
      />,
    );
    expect(screen.getAllByRole("link", { name: "Acme renewal" }).length).toBeGreaterThan(0);
  });

  it("shows a dash for an absent pointer rather than a link with no target", () => {
    render(<RecordDetail layout={POINTING} record={{ title: "One", dealId: null }} />);
    expect(screen.queryByRole("link")).toBeNull();
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
    // Twice per row: the table row and the card that replaces it below the
    // breakpoint, which carries the same controls.
    expect(screen.getAllByLabelText("Done")).toHaveLength(rows.length * 2);
    expect(screen.getAllByRole("button", { name: "More" })).toHaveLength(rows.length * 2);
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });
});

describe("a description that names a reference badly", () => {
  it("reports a referenceLabel naming a field the record does not carry", () => {
    const broken: RecordLayout = {
      ...POINTING,
      fields: POINTING.fields.map((field) =>
        field.name === "dealId" ? { ...field, referenceLabel: "notAField" } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (dealId).referenceLabel" }),
    );
  });

  it("reports a referenceLabel on a field that points at nothing", () => {
    const broken: RecordLayout = {
      ...POINTING,
      fields: POINTING.fields.map((field) =>
        field.name === "title" ? { ...field, referenceLabel: "dealTitle" } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (title)" }),
    );
  });
});

/**
 * One record shape with several arms.
 *
 * A validation rule's configuration depends on its type; a custom field's
 * options only exist when it is a select. Written by hand each of those is a
 * form with five branches; described without `visibleWhen`, the alternative is
 * rendering every arm's fields at once, which is a worse form than the one it
 * replaces. The distinction the vocabulary makes is that an inapplicable field
 * is not *hidden* — it is not part of this record — so it is not validated and
 * not submitted.
 */
const CONDITIONAL: RecordLayout = {
  key: "test:conditional",
  singular: "Rule",
  plural: "Rules",
  titleField: "name",
  fields: [
    { name: "name", label: "Name", kind: "text", required: true },
    {
      name: "ruleType",
      label: "Type",
      kind: "select",
      required: true,
      createOnly: true,
      options: [
        { value: "regex", label: "Pattern" },
        { value: "range", label: "Range" },
      ],
    },
    {
      name: "pattern",
      label: "Pattern",
      kind: "text",
      required: true,
      visibleWhen: { field: "ruleType", equals: ["regex"] },
    },
    {
      name: "maximum",
      label: "Maximum",
      kind: "number",
      required: true,
      visibleWhen: { field: "ruleType", equals: ["range"] },
    },
  ],
  list: {
    searchPlaceholder: "Search rules…",
    columns: [
      { field: "name", primary: true },
      { field: "ruleType" },
    ],
  },
  detail: { sections: [{ title: "Rule", fields: ["name", "ruleType", "pattern", "maximum"] }] },
  form: { sections: [{ title: "Rule", fields: ["name", "ruleType", "pattern", "maximum"] }] },
};

describe("a field that only applies on one arm of the record", () => {
  it("is a valid description", () => {
    expect(validateLayout(CONDITIONAL)).toEqual([]);
  });

  it("reports a condition on a field the description does not declare", () => {
    const broken: RecordLayout = {
      ...CONDITIONAL,
      fields: CONDITIONAL.fields.map((field) =>
        field.name === "pattern"
          ? { ...field, visibleWhen: { field: "notAField", equals: ["x"] } }
          : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (pattern).visibleWhen" }),
    );
  });

  it("reports a condition with no values, which would never apply", () => {
    const broken: RecordLayout = {
      ...CONDITIONAL,
      fields: CONDITIONAL.fields.map((field) =>
        field.name === "pattern"
          ? { ...field, visibleWhen: { field: "ruleType", equals: [] } }
          : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ message: "no values, so the field would never apply" }),
    );
  });

  it("renders only the arm the record is currently on", () => {
    render(
      <RecordForm layout={CONDITIONAL} initial={{ ruleType: "regex" }} onSubmit={jest.fn()} />,
    );
    expect(screen.getByLabelText(/Pattern/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Maximum/)).toBeNull();
  });

  it("swaps arms when the controlling field changes", async () => {
    render(
      <RecordForm layout={CONDITIONAL} initial={{ ruleType: "range" }} onSubmit={jest.fn()} />,
    );
    expect(screen.getByLabelText(/Maximum/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Pattern/)).toBeNull();
  });

  it("does not let an inapplicable required field block a submit", async () => {
    const onSubmit = jest.fn();
    render(
      <RecordForm
        layout={CONDITIONAL}
        initial={{ name: "One", ruleType: "regex", pattern: "^a" }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }));
    // `maximum` is required and empty, and belongs to the other arm.
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });

  it("still enforces a required field on the arm the record is on", async () => {
    const onSubmit = jest.fn();
    render(
      <RecordForm
        layout={CONDITIONAL}
        initial={{ name: "One", ruleType: "regex" }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }));
    expect(await screen.findByText("Pattern is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits only the fields the record is actually on", async () => {
    const onSubmit = jest.fn();
    render(
      <RecordForm
        layout={CONDITIONAL}
        initial={{ name: "One", ruleType: "regex", pattern: "^a" }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.submit(screen.getByRole("button", { name: /save rule/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.pattern).toBe("^a");
    expect("maximum" in submitted).toBe(false);
  });
});

describe("a field decided once and then fixed", () => {
  it("appears on a create form", () => {
    render(<RecordForm layout={CONDITIONAL} mode="create" onSubmit={jest.fn()} />);
    expect(screen.getByLabelText(/Type/)).toBeInTheDocument();
  });

  it("is absent when editing, because the API would drop it silently", () => {
    render(
      <RecordForm
        layout={CONDITIONAL}
        mode="edit"
        initial={{ ruleType: "regex" }}
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText(/^Type/)).toBeNull();
  });
});

describe("a record with no list at all", () => {
  it("is a valid description, because a singleton is a real shape", () => {
    const singleton: RecordLayout = {
      key: "test:singleton",
      singular: "Setting",
      plural: "Settings",
      titleField: "name",
      fields: [{ name: "name", label: "Name", kind: "text", required: true }],
      list: { searchPlaceholder: "", columns: [] },
      detail: { sections: [{ title: "Settings", fields: ["name"] }] },
      form: { sections: [{ title: "Settings", fields: ["name"] }] },
    };
    expect(validateLayout(singleton)).toEqual([]);
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
    // Twice: once in the table row, once in the card that replaces it below the
    // breakpoint. A card that dropped it left a task nobody could tick off.
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

/**
 * A pointer whose domain changes row by row.
 *
 * A task links to a lead on this row and a deal on the next; a contact role
 * attaches to a deal or a company depending on a sibling field. `referenceTo`
 * names one domain for the whole column, so two migrations stopped here rather
 * than describe a lie. `referenceToField` is the per-row half, the same way
 * `referenceLabel` is the per-row half of a pointer's name.
 */
const POLYMORPHIC: RecordLayout = {
  key: "test:polymorphic",
  singular: "Job",
  plural: "Jobs",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", kind: "text", required: true },
    { name: "entityType", label: "Attached to", kind: "text" },
    {
      name: "entityId",
      label: "Record",
      kind: "reference",
      referenceToField: "entityType",
      referenceTo: "lead",
      referenceLabel: "entityName",
    },
    { name: "entityName", label: "Record name", kind: "text", readOnly: true },
  ],
  list: {
    searchPlaceholder: "Search jobs…",
    columns: [
      { field: "title", primary: true },
      { field: "entityId" },
    ],
  },
  detail: { sections: [{ title: "Job", fields: ["title", "entityId"] }] },
  form: { sections: [{ title: "Job", fields: ["title"] }] },
};

describe("a pointer whose domain the row decides", () => {
  it("is a valid description", () => {
    expect(validateLayout(POLYMORPHIC)).toEqual([]);
  });

  it("links each row at whatever the row says it points at", () => {
    render(
      <RecordDetail
        layout={POLYMORPHIC}
        record={{ title: "One", entityType: "DEAL", entityId: 7, entityName: "Acme renewal" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Acme renewal" })).toHaveAttribute(
      "href",
      "/crm/deals/7",
    );
  });

  it("falls back to the field's own domain when the row carries none", () => {
    render(
      <RecordDetail
        layout={POLYMORPHIC}
        record={{ title: "One", entityId: 7, entityName: "A lead" }}
      />,
    );
    expect(screen.getByRole("link", { name: "A lead" })).toHaveAttribute("href", "/crm/leads/7");
  });

  it("renders text rather than a link when the row names a domain with no page", () => {
    render(
      <RecordDetail
        layout={POLYMORPHIC}
        record={{ title: "One", entityType: "PROJECT", entityId: 7, entityName: "A project" }}
      />,
    );
    expect(screen.getByText("A project")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "A project" })).toBeNull();
  });

  it("reports a domain field the description does not declare", () => {
    const broken: RecordLayout = {
      ...POLYMORPHIC,
      fields: POLYMORPHIC.fields.map((field) =>
        field.name === "entityId" ? { ...field, referenceToField: "notAField" } : field,
      ),
    };
    expect(validateLayout(broken)).toContainEqual(
      expect.objectContaining({ where: "fields (entityId).referenceToField" }),
    );
  });
});
