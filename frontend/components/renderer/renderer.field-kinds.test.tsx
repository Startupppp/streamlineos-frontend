import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toneForSignedValue, type RecordLayout } from "@/lib/renderer/layout";
import { validateLayout } from "@/lib/renderer/layout-validation";
import { formatFieldText } from "./format-value";
import { RecordDetail } from "./record-detail";
import { RecordForm } from "./record-form";
import { RecordList } from "./record-list";

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
