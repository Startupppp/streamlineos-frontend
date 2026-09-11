import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { validateLayout, type RecordLayout } from "@/lib/renderer/layout";
import { formatFieldText } from "./format-value";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

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

describe("a field that points at another record", () => {
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

describe("a field that points at another record — controls", () => {
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
