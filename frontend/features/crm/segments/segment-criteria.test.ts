import type { SegmentFieldType, SegmentFilterNode } from "@/types/crm/segments";
import {
  EMPTY_CRITERION_ROW,
  SEGMENT_OPERATORS_FOR_TYPE,
  describeSegmentCriteria,
  toCriterionRows,
  toSegmentCriteria,
  type SegmentCriterionDraft,
} from "./segment-criteria";

/**
 * The conversion between what a person draws and what the server stores.
 *
 * Two things are worth pinning. The **round trip**: a segment saved from this
 * control must reopen as the same rows, or editing one silently rewrites it. And
 * the **refusals**: this control draws a flat conjunction, so anything else has
 * to come back as `null` rather than as a flattened approximation that means
 * something different from what the author saved.
 */

const TYPES: Record<string, SegmentFieldType> = {
  industry: "text",
  party_type: "enum",
  health_score: "number",
  created_at: "timestamp",
};

const typeOf = (field: string): SegmentFieldType | undefined => TYPES[field];
const labelOf = (field: string): string => field;

const row = (over: Partial<SegmentCriterionDraft>): SegmentCriterionDraft => ({
  ...EMPTY_CRITERION_ROW,
  ...over,
});

describe("rows to criteria", () => {
  it("emits a bare comparison for a single row, not a one-child conjunction", () => {
    /**
     * Both compile identically. The stored artefact is what somebody reads in a
     * support ticket, and `{"kind":"and","nodes":[…one…]}` invites the question
     * of what the missing sibling was.
     */
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
    /**
     * A number field sent as `"70"` compiles — the compiler casts — but the
     * stored tree would then disagree with the same criterion entered through
     * any other client, and `"7"` would sort before `"70"` in a future reader
     * that trusted the JSON.
     */
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
    /**
     * How `= NULL` — the classic silently-empty result — stays unrepresentable
     * rather than special-cased. The leaf has no `value` slot to fill.
     */
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
    /**
     * Dropping it would send criteria the person did not write — a narrower
     * segment than the one on their screen, saved under the name they chose.
     */
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
    /**
     * The honest half. An `or` flattened into a conjunction is a different
     * segment, and rewriting somebody's saved criteria while showing them a
     * form that looks fine is worse than declining to edit them.
     */
    const disjunction: SegmentFilterNode = {
      kind: "or",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "compare", field: "industry", operator: "eq", value: "Jute" },
      ],
    };
    expect(toCriterionRows(disjunction, typeOf)).toBeNull();

    const nested: SegmentFilterNode = {
      kind: "and",
      nodes: [
        { kind: "compare", field: "industry", operator: "eq", value: "Textiles" },
        { kind: "not", node: { kind: "compare", field: "industry", operator: "is_null" } },
      ],
    };
    expect(toCriterionRows(nested, typeOf)).toBeNull();
  });

  it("declines a criterion naming a field this caller's catalogue lacks", () => {
    /**
     * Happens when a field is withdrawn from the registry, or when the reader
     * holds a narrower grant than the author. Rendering it as a blank control
     * would silently drop the criterion on the next save.
     */
    const withdrawn: SegmentFilterNode = {
      kind: "compare",
      field: "tax_number",
      operator: "eq",
      value: "AAAAA0000A",
    };
    expect(toCriterionRows(withdrawn, typeOf)).toBeNull();
  });

  it("declines an operator this control does not offer for that type", () => {
    /**
     * `between` is in the server's vocabulary and absent from this builder. A
     * segment carrying one opens read-only rather than losing its range.
     */
    const ranged: SegmentFilterNode = {
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
    const criteria: SegmentFilterNode = {
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
    /**
     * The direction of drift that matters. Offering fewer operators than the
     * server accepts costs an affordance; offering more produces a 400 the
     * person cannot act on. Enum in particular must not carry substring
     * matching — Postgres has no `ILIKE` between an enum and text, so it is a
     * refusal rather than a slow query.
     */
    expect(SEGMENT_OPERATORS_FOR_TYPE.enum).not.toContain("contains");
    expect(SEGMENT_OPERATORS_FOR_TYPE.enum).not.toContain("gt");
    expect(SEGMENT_OPERATORS_FOR_TYPE.number).not.toContain("contains");
    expect(SEGMENT_OPERATORS_FOR_TYPE.boolean).toEqual(["eq", "ne", "is_null", "is_not_null"]);
    for (const operators of Object.values(SEGMENT_OPERATORS_FOR_TYPE))
      expect(operators).not.toContain("between");
  });
});
