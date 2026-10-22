import type { ReportingQueryDescription } from "@/types/crm/reporting";
import { toBuilderValues } from "./report-builder-values";
import { buildQueryDescription } from "./report-query-description";
import type { ReportFieldOption } from "./report-source-fields";


const options: ReportFieldOption[] = [
  { name: "name", label: "Name", type: "text", group: "Deals" },
  { name: "stage", label: "Stage", type: "enum", group: "Deals" },
  { name: "amount", label: "Amount", type: "number", group: "Deals" },
  { name: "closedAt", label: "Closed", type: "timestamp", group: "Deals" },
];

const description: ReportingQueryDescription = {
  source: "deals",
  select: [
    { kind: "field", field: "stage" },
    { kind: "aggregate", aggregate: "sum", field: "amount" },
    { kind: "aggregate", aggregate: "count" },
  ],
  filter: {
    kind: "and",
    nodes: [
      { kind: "compare", field: "stage", operator: "in", values: ["won", "lost"] },
      { kind: "compare", field: "amount", operator: "between", from: 100, to: 900 },
      { kind: "compare", field: "closedAt", operator: "is_not_null" },
    ],
  },
  groupBy: ["stage"],
  orderBy: [{ select: 1, direction: "desc" }],
  limit: 250,
  offset: 500,
};

describe("toBuilderValues", () => {
  it("round-trips a description the builder could have produced", () => {
    const loaded = toBuilderValues(description, options);
    expect(loaded.kind).toBe("loaded");
    if (loaded.kind !== "loaded") return;

    expect(buildQueryDescription(loaded.values)).toEqual(description);
    expect(loaded.unknownFields).toEqual([]);
  });

  it("recovers the field type each control needs, which the description does not carry", () => {
    const loaded = toBuilderValues(description, options);
    if (loaded.kind !== "loaded") throw new Error("expected the description to load");

    expect(loaded.values.select[0]).toEqual({
      aggregate: "none",
      field: "stage",
      fieldType: "enum",
    });
    expect(loaded.values.select[2]).toEqual({
      aggregate: "count",
      field: "",
      fieldType: "",
    });
    expect(loaded.values.filters[1]?.fieldType).toBe("number");
    expect(loaded.values.filters[1]?.from).toBe("100");
  });

  it("names the fields it could not resolve rather than loading them silently", () => {
    const loaded = toBuilderValues(description, [options[0]!]);
    if (loaded.kind !== "loaded") throw new Error("expected the description to load");

    expect(loaded.unknownFields).toEqual(["stage", "amount", "closedAt"]);
  });

  it("refuses a filter tree it cannot draw instead of showing fewer conditions", () => {
    const nested: ReportingQueryDescription = {
      ...description,
      filter: {
        kind: "or",
        nodes: [
          { kind: "compare", field: "stage", operator: "eq", value: "won" },
          { kind: "compare", field: "amount", operator: "gt", value: 1000 },
        ],
      },
    };

    expect(toBuilderValues(nested, options).kind).toBe("unrepresentable");
    expect(
      toBuilderValues(
        {
          ...description,
          filter: { kind: "not", node: { kind: "compare", field: "stage", operator: "is_null" } },
        },
        options,
      ).kind,
    ).toBe("unrepresentable");
  });

  it("loads a description with no filter at all", () => {
    const { filter, ...withoutFilter } = description;
    void filter;
    const loaded = toBuilderValues(withoutFilter, options);
    if (loaded.kind !== "loaded") throw new Error("expected the description to load");

    expect(loaded.values.filters).toEqual([]);
    expect(buildQueryDescription(loaded.values)).toEqual(withoutFilter);
  });
});
