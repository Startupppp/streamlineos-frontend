import type { ReportingFieldType, ReportingFilterNode } from "@/types/crm/reporting";
import {
  EMPTY_CRITERION_ROW,
  SEGMENT_OPERATORS_FOR_TYPE,
  describeSegmentCriteria,
  toCriterionRows,
  toSegmentCriteria,
  type SegmentCriterionDraft,
} from "./segment-criteria";


const TYPES: Record<string, ReportingFieldType> = {
  industry: "text",
  party_type: "enum",
  health_score: "number",
  created_at: "timestamp",
};

const typeOf = (field: string): ReportingFieldType | undefined => TYPES[field];
const labelOf = (field: string): string => field;

const row = (over: Partial<SegmentCriterionDraft>): SegmentCriterionDraft => ({
  ...EMPTY_CRITERION_ROW,
  ...over,
});

describe("rows to criteria", () => {
  it("emits a bare comparison for a single row, not a one-child conjunction", () => {
    expect(
      toSegmentCriteria([
        row({ field: "industry", fieldType: "text", operator: "eq", value: "Textiles" }),
      ]),
    ).toEqual({ kind: "compare", field: "industry", operator: "eq", value: "Textiles" });
  });

  it("conjoins several rows, because every criterion narrows the set", () => {
    expect(
      toSegmentCriteria([
        row({ field: "industry", fieldType: "text", operator: "eq", value: "Textiles" }),
        row({ field: "health_score", fieldType: "number", operator: "gte", value: "70" }),
      ]),
    ).toEqual({
      kind: "and",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "compare", field: "health_score", operator: "gte", value: 70 },
      ],
    });
  });

  it("types the value rather than sending everything as text", () => {
    const criteria = toSegmentCriteria([
      row({ field: "health_score", fieldType: "number", operator: "lt", value: "40" }),
    ]);
    expect(criteria).toEqual({
      kind: "compare",
      field: "health_score",
      operator: "lt",
      value: 40,
    });
  });

  it("carries a unary comparison with no value at all", () => {
    expect(
      toSegmentCriteria([
        row({ field: "industry", fieldType: "text", operator: "is_null", value: "ignored" }),
      ]),
    ).toEqual({ kind: "compare", field: "industry", operator: "is_null" });
  });

  it("splits a membership list on newlines, so a value may contain a comma", () => {
    expect(
      toSegmentCriteria([
        row({
          field: "industry",
          fieldType: "text",
          operator: "in",
          values: "Textiles\nJute, and rope\n\n  Logistics  ",
        }),
      ]),
    ).toEqual({
      kind: "compare",
      field: "industry",
      operator: "in",
      values: ["Textiles", "Jute, and rope", "Logistics"],
    });
  });

  it("refuses an incomplete row rather than dropping it", () => {
    expect(toSegmentCriteria([])).toBeNull();
    expect(toSegmentCriteria([row({ field: "", fieldType: "" })])).toBeNull();
    expect(
      toSegmentCriteria([row({ field: "industry", fieldType: "text", operator: "eq", value: "" })]),
    ).toBeNull();
    expect(
      toSegmentCriteria([
        row({ field: "health_score", fieldType: "number", operator: "eq", value: "not a number" }),
      ]),
    ).toBeNull();
    expect(
      toSegmentCriteria([row({ field: "industry", fieldType: "text", operator: "in", values: " \n " })]),
    ).toBeNull();
  });
});

describe("criteria back to rows", () => {
  it("round-trips what this control drew", () => {
    const rows = [
      row({ field: "industry", fieldType: "text", operator: "eq", value: "Textiles" }),
      row({ field: "party_type", fieldType: "enum", operator: "in", values: "CUSTOMER\nPARTNER" }),
    ];
    const criteria = toSegmentCriteria(rows);
    expect(criteria).not.toBeNull();
    if (!criteria) return;
    expect(toCriterionRows(criteria, typeOf)).toEqual(rows);
  });

  it("declines a tree it cannot draw, instead of flattening it", () => {
    const disjunction: ReportingFilterNode = {
      kind: "or",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "compare", field: "industry", operator: "eq", value: "Jute" },
      ],
    };
    expect(toCriterionRows(disjunction, typeOf)).toBeNull();

    const nested: ReportingFilterNode = {
      kind: "and",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "not", node: { kind: "compare", field: "industry", operator: "is_null" } },
      ],
    };
    expect(toCriterionRows(nested, typeOf)).toBeNull();
  });

  it("declines a criterion naming a field this caller's catalogue lacks", () => {
    const withdrawn: ReportingFilterNode = {
      kind: "compare",
      field: "tax_number",
      operator: "eq",
      value: "AAAAA0000A",
    };
    expect(toCriterionRows(withdrawn, typeOf)).toBeNull();
  });

  it("declines an operator this control does not offer for that type", () => {
    const ranged: ReportingFilterNode = {
      kind: "compare",
      field: "health_score",
      operator: "between",
      from: 10,
      to: 20,
    };
    expect(toCriterionRows(ranged, typeOf)).toBeNull();
  });
});

describe("criteria as a sentence", () => {
  it("reads as a description of customers, not as a query", () => {
    const criteria: ReportingFilterNode = {
      kind: "and",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "compare", field: "party_type", operator: "in", values: ["CUSTOMER", "PARTNER"] },
        { kind: "compare", field: "created_at", operator: "is_not_null" },
      ],
    };
    expect(describeSegmentCriteria(criteria, labelOf)).toBe(
      "industry is Textiles · party_type is any of CUSTOMER, PARTNER · created_at is not empty",
    );
  });

  it("says it cannot describe a tree it did not draw, rather than guessing", () => {
    expect(
      describeSegmentCriteria(
        {
          kind: "or",
          nodes: [{ kind: "compare", field: "industry", operator: "is_null" }],
        },
        labelOf,
      ),
    ).toBe("Criteria built elsewhere");
  });
});

describe("the operators this control offers", () => {
  it("never offers one the compiler refuses for that type", () => {
    expect(SEGMENT_OPERATORS_FOR_TYPE.enum).not.toContain("contains");
    expect(SEGMENT_OPERATORS_FOR_TYPE.enum).not.toContain("gt");
    expect(SEGMENT_OPERATORS_FOR_TYPE.number).not.toContain("contains");
    expect(SEGMENT_OPERATORS_FOR_TYPE.boolean).toEqual(["eq", "ne", "is_null", "is_not_null"]);
    for (const operators of Object.values(SEGMENT_OPERATORS_FOR_TYPE))
      expect(operators).not.toContain("between");
  });
});
