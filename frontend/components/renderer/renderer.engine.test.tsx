import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { validateLayout, type RecordLayout } from "@/lib/renderer/layout";
import { formatFieldText } from "./format-value";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

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
      { field: "name", primary: true, subtitle: "email" },
      { field: "quantity" },
      { field: "band" },
      { field: "opened" },
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
    expect(screen.getAllByText("Specimen One")).toHaveLength(2);
  });

  it("right-aligns and tabularises numeric kinds because the kind says so", () => {
    const { container } = render(
      <RecordList layout={EVERY_KIND} rows={[specimen]} getRowKey={specimenKey} />,
    );
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

  it("formats a money field in the organisation's currency", () => {
    render(
      <RecordDetail
        layout={EVERY_KIND}
        record={specimen}
        money={{ currency: "GBP", locale: "en-GB" }}
      />,
    );
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
    render(<RecordForm layout={EVERY_KIND} onSubmit={jest.fn()} />);
    expect(screen.getByRole("button", { name: /save specimen/i })).toBeInTheDocument();
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
