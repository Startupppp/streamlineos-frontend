import {
  DEFAULT_REPORT_BUILDER_VALUES,
  EMPTY_FILTER_ROW,
  NO_AGGREGATE,
  reportBuilderSchema,
  splitListValues,
  type ReportBuilderValues,
} from "./report-builder-schema";
import { buildQueryDescription } from "./report-query-description";
import { REPORT_MAX_FILTER_BRANCHES, REPORT_QUERY_LIMITS } from "./report-query-limits";

/**
 * The builder refuses what the compiler would refuse.
 *
 * Every case here has a counterpart in `compiler/compile.spec.ts` or in the
 * DTO — the point of asserting them again on this side is that a control which
 * lets somebody assemble a rejected query has taught them nothing, and the two
 * bounds drift the moment nobody is checking.
 */

function values(overrides: Partial<ReportBuilderValues>): ReportBuilderValues {
  return { ...DEFAULT_REPORT_BUILDER_VALUES, source: "deals", ...overrides };
}

const stageColumn = { aggregate: NO_AGGREGATE, field: "stage", fieldType: "text" } as const;
const valueColumn = {
  aggregate: NO_AGGREGATE,
  field: "value_minor",
  fieldType: "number",
} as const;

describe("reportBuilderSchema", () => {
  it("accepts a plain projection", () => {
    const result = reportBuilderSchema.safeParse(values({ select: [{ ...stageColumn }] }));
    expect(result.success).toBe(true);
  });

  it("requires a source", () => {
    const result = reportBuilderSchema.safeParse(
      values({ source: "", select: [{ ...stageColumn }] }),
    );
    expect(result.success).toBe(false);
  });

  it("lets count omit its field, and refuses the omission for every other aggregate", () => {
    const countRows = reportBuilderSchema.safeParse(
      values({ select: [{ aggregate: "count", field: "", fieldType: "" }] }),
    );
    expect(countRows.success).toBe(true);

    const sumOfNothing = reportBuilderSchema.safeParse(
      values({ select: [{ aggregate: "sum", field: "", fieldType: "" }] }),
    );
    expect(sumOfNothing.success).toBe(false);
  });

  it("refuses an aggregate the field's type does not carry", () => {
    const result = reportBuilderSchema.safeParse(
      values({ select: [{ aggregate: "sum", field: "stage", fieldType: "text" }] }),
    );
    expect(result.success).toBe(false);
  });

  it("refuses an operator the field's type does not carry", () => {
    const result = reportBuilderSchema.safeParse(
      values({
        select: [{ ...stageColumn }],
        filters: [
          { ...EMPTY_FILTER_ROW, field: "party_type", fieldType: "enum", operator: "contains", value: "x" },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("refuses a bare column beside an aggregate unless it is grouped", () => {
    const ungrouped = reportBuilderSchema.safeParse(
      values({
        select: [{ ...stageColumn }, { aggregate: "sum", field: "value_minor", fieldType: "number" }],
      }),
    );
    expect(ungrouped.success).toBe(false);

    const grouped = reportBuilderSchema.safeParse(
      values({
        select: [{ ...stageColumn }, { aggregate: "sum", field: "value_minor", fieldType: "number" }],
        groupBy: ["stage"],
      }),
    );
    expect(grouped.success).toBe(true);
  });

  it("refuses a sort on a column the report does not return", () => {
    const result = reportBuilderSchema.safeParse(
      values({ select: [{ ...stageColumn }], orderBy: [{ select: 3, direction: "asc" }] }),
    );
    expect(result.success).toBe(false);
  });

  it("holds the server's numeric bounds", () => {
    expect(
      reportBuilderSchema.safeParse(
        values({ select: [{ ...stageColumn }], limit: REPORT_QUERY_LIMITS.maxLimit + 1 }),
      ).success,
    ).toBe(false);
    expect(
      reportBuilderSchema.safeParse(
        values({ select: [{ ...stageColumn }], offset: REPORT_QUERY_LIMITS.maxOffset + 1 }),
      ).success,
    ).toBe(false);
    expect(
      reportBuilderSchema.safeParse(
        values({
          select: Array.from({ length: REPORT_QUERY_LIMITS.maxSelect + 1 }, () => ({
            ...stageColumn,
          })),
        }),
      ).success,
    ).toBe(false);
  });

  /**
   * `MAX_BRANCHES` is in the DTO, not in `QUERY_LIMITS`, so it is the bound most
   * likely to be missed — a builder capped at `maxFilterNodes` would let
   * somebody assemble 99 filters and take a 400 for the twenty-first.
   */
  it("caps filters at the DTO's branch limit, not at the node limit", () => {
    const filter = {
      ...EMPTY_FILTER_ROW,
      field: "stage",
      fieldType: "text",
      operator: "eq",
      value: "won",
    } as const;
    const atCap = reportBuilderSchema.safeParse(
      values({
        select: [{ ...stageColumn }],
        filters: Array.from({ length: REPORT_MAX_FILTER_BRANCHES }, () => ({ ...filter })),
      }),
    );
    expect(atCap.success).toBe(true);

    const overCap = reportBuilderSchema.safeParse(
      values({
        select: [{ ...stageColumn }],
        filters: Array.from({ length: REPORT_MAX_FILTER_BRANCHES + 1 }, () => ({ ...filter })),
      }),
    );
    expect(overCap.success).toBe(false);
  });

  it("caps an in-list at the server's value limit", () => {
    const listOf = (count: number) =>
      reportBuilderSchema.safeParse(
        values({
          select: [{ ...stageColumn }],
          filters: [
            {
              ...EMPTY_FILTER_ROW,
              field: "stage",
              fieldType: "text",
              operator: "in",
              values: Array.from({ length: count }, (_, index) => `stage-${index}`).join("\n"),
            },
          ],
        }),
      );
    expect(listOf(REPORT_QUERY_LIMITS.maxInValues).success).toBe(true);
    expect(listOf(REPORT_QUERY_LIMITS.maxInValues + 1).success).toBe(false);
    expect(listOf(0).success).toBe(false);
  });

  it("refuses a value the field's type cannot hold", () => {
    const result = reportBuilderSchema.safeParse(
      values({
        select: [{ ...valueColumn }],
        filters: [
          {
            ...EMPTY_FILTER_ROW,
            field: "value_minor",
            fieldType: "number",
            operator: "gt",
            value: "not-a-number",
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });

  it("requires both bounds of a between", () => {
    const result = reportBuilderSchema.safeParse(
      values({
        select: [{ ...valueColumn }],
        filters: [
          {
            ...EMPTY_FILTER_ROW,
            field: "value_minor",
            fieldType: "number",
            operator: "between",
            from: "100",
            to: "",
          },
        ],
      }),
    );
    expect(result.success).toBe(false);
  });
});

describe("splitListValues", () => {
  it("splits on newlines only, so a value may contain a comma", () => {
    expect(splitListValues("Acme, Inc.\n  Globex  \n\n")).toEqual(["Acme, Inc.", "Globex"]);
  });
});

describe("buildQueryDescription", () => {
  it("omits every optional key it has nothing to say about", () => {
    const description = buildQueryDescription(values({ select: [{ ...stageColumn }] }));
    expect(description).toEqual({
      source: "deals",
      select: [{ kind: "field", field: "stage" }],
      limit: DEFAULT_REPORT_BUILDER_VALUES.limit,
    });
    expect("filter" in description).toBe(false);
    expect("groupBy" in description).toBe(false);
    expect("orderBy" in description).toBe(false);
    expect("offset" in description).toBe(false);
  });

  it("emits count(*) as an aggregate with no field", () => {
    const description = buildQueryDescription(
      values({ select: [{ aggregate: "count", field: "", fieldType: "" }] }),
    );
    expect(description.select).toEqual([{ kind: "aggregate", aggregate: "count" }]);
  });

  it("wraps filters in one flat and, and coerces each value to its field's type", () => {
    const description = buildQueryDescription(
      values({
        select: [{ ...valueColumn }],
        filters: [
          {
            ...EMPTY_FILTER_ROW,
            field: "value_minor",
            fieldType: "number",
            operator: "gte",
            value: "500",
          },
          {
            ...EMPTY_FILTER_ROW,
            field: "stage",
            fieldType: "text",
            operator: "in",
            values: "won\nlost",
          },
        ],
      }),
    );
    expect(description.filter).toEqual({
      kind: "and",
      nodes: [
        { kind: "compare", field: "value_minor", operator: "gte", value: 500 },
        { kind: "compare", field: "stage", operator: "in", values: ["won", "lost"] },
      ],
    });
  });

  it("carries a unary operator with no value slot at all", () => {
    const description = buildQueryDescription(
      values({
        select: [{ ...stageColumn }],
        filters: [
          {
            ...EMPTY_FILTER_ROW,
            field: "lost_reason",
            fieldType: "text",
            operator: "is_null",
            value: "ignored",
          },
        ],
      }),
    );
    expect(description.filter).toEqual({
      kind: "and",
      nodes: [{ kind: "compare", field: "lost_reason", operator: "is_null" }],
    });
  });

  it("sends the offset only once paging has moved off the first page", () => {
    expect(buildQueryDescription(values({ select: [{ ...stageColumn }], offset: 0 })).offset).toBe(
      undefined,
    );
    expect(
      buildQueryDescription(values({ select: [{ ...stageColumn }], offset: 200 })).offset,
    ).toBe(200);
  });
});
