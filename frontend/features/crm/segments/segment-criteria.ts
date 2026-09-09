import type {
  ReportingComparisonOperator,
  ReportingFilterLeaf,
} from "@/types/crm/reporting";
import type { SegmentFieldType, SegmentFilterNode } from "@/types/crm/segments";

/**
 * The criteria a person assembles, and the tree the server stores.
 *
 * ## Why this is a flat list of rows and not a tree editor
 *
 * The server's criteria vocabulary is a full boolean tree — `and`, `or`, `not`,
 * six levels deep. A control that exposed all of it would be a visual
 * programming language, and the thing people actually build is "industry is
 * Textiles **and** lifecycle stage is not Churned". So this builder emits one
 * flat conjunction and nothing else. Every criterion narrows the set; that is
 * the mental model a segment has, and it is legible without a legend.
 *
 * The consequence is stated rather than hidden. A tree that did not come from
 * this control — nested, or containing an `or` — cannot be shown as rows, so
 * `toCriterionRows` returns `null` for it and the caller says so instead of
 * flattening it into something that means something else. Silently rewriting
 * somebody's saved criteria is worse than declining to edit them.
 *
 * ## Why the operator table is duplicated here
 *
 * `REPORT_OPERATORS_FOR_TYPE` in `features/crm/reports/builder/` says almost
 * this, and importing it is banned: feature-to-feature imports are how two
 * features become one. What makes the copy safe is that it is a strict
 * **narrowing** of the compiler's table, never a widening — `between` is absent
 * because a segment rarely needs a two-ended range and a range row doubles the
 * control. Drift in that direction can only ever refuse something the server
 * would have accepted. Drift the other way — offering an operator the compiler
 * rejects for that type — would produce a 400 the person cannot act on, which is
 * why nothing below adds an operator the compiler's own table lacks.
 */

export type SegmentOperator = ReportingComparisonOperator;

/**
 * Which comparisons this control offers per field type.
 *
 * A subset of `OPERATORS_FOR_TYPE` in `compiler/compile.ts`, case for case.
 * Enum omits substring matching because Postgres has no `ILIKE` between an enum
 * and text — that is a compile-time refusal, not a slow query. Boolean and the
 * date types omit list membership because "is any of true, false" is not a
 * question.
 */
export const SEGMENT_OPERATORS_FOR_TYPE: Record<
  SegmentFieldType,
  readonly SegmentOperator[]
> = {
  text: [
    "eq",
    "ne",
    "contains",
    "starts_with",
    "ends_with",
    "in",
    "not_in",
    "is_null",
    "is_not_null",
  ],
  enum: ["eq", "ne", "in", "not_in", "is_null", "is_not_null"],
  number: ["eq", "ne", "gt", "gte", "lt", "lte", "in", "not_in", "is_null", "is_not_null"],
  timestamp: ["eq", "ne", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
  date: ["eq", "ne", "gt", "gte", "lt", "lte", "is_null", "is_not_null"],
  boolean: ["eq", "ne", "is_null", "is_not_null"],
};

/**
 * Operator labels in the language of a set, not of a query.
 *
 * "is empty" rather than "IS NULL", "is any of" rather than "IN". The person
 * building a segment is describing customers, and a row that reads
 * `industry is any of Textiles, Jute` is a sentence they can check.
 */
export const SEGMENT_OPERATOR_LABELS: Record<SegmentOperator, string> = {
  eq: "is",
  ne: "is not",
  lt: "is before or under",
  lte: "is at most",
  gt: "is after or over",
  gte: "is at least",
  contains: "contains",
  starts_with: "starts with",
  ends_with: "ends with",
  in: "is any of",
  not_in: "is none of",
  is_null: "is empty",
  is_not_null: "is not empty",
  between: "is between",
};

export type SegmentOperatorArity = "unary" | "binary" | "list";

export function segmentOperatorArity(operator: SegmentOperator): SegmentOperatorArity {
  if (operator === "is_null" || operator === "is_not_null") return "unary";
  if (operator === "in" || operator === "not_in") return "list";
  return "binary";
}

/** One row of the builder. `fieldType` travels beside the field so the per-type
 * rules are decidable without reaching back into the source catalogue. */
export interface SegmentCriterionDraft {
  field: string;
  fieldType: SegmentFieldType | "";
  operator: SegmentOperator;
  value: string;
  /** `in`/`not_in` lists, one value per line, so a value may contain a comma. */
  values: string;
}

export const EMPTY_CRITERION_ROW: SegmentCriterionDraft = {
  field: "",
  fieldType: "",
  operator: "eq",
  value: "",
  values: "",
};

/** One value per line, so a company name with a comma in it survives. */
export function splitCriterionValues(raw: string): string[] {
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

/**
 * A typed scalar, or `null` when the text is not one.
 *
 * `null` rather than a thrown error or a silent coercion: the caller is either
 * validating (and wants to say which row is wrong) or building (and must not
 * send `NaN`, which becomes `null` over JSON and then a predicate that matches
 * nothing).
 */
export function toScalar(
  raw: string,
  type: SegmentFieldType,
): string | number | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;

  if (type === "number") {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (type === "boolean") {
    if (trimmed === "true") return true;
    if (trimmed === "false") return false;
    return null;
  }
  return trimmed;
}

function toLeaf(row: SegmentCriterionDraft): ReportingFilterLeaf | null {
  if (row.field === "" || row.fieldType === "") return null;
  const arity = segmentOperatorArity(row.operator);

  if (arity === "unary") {
    if (row.operator !== "is_null" && row.operator !== "is_not_null") return null;
    return { kind: "compare", field: row.field, operator: row.operator };
  }

  if (arity === "list") {
    if (row.operator !== "in" && row.operator !== "not_in") return null;
    const fieldType = row.fieldType;
    const parsed = splitCriterionValues(row.values).map((entry) => toScalar(entry, fieldType));
    if (parsed.length === 0 || parsed.some((entry) => entry === null)) return null;
    const values = parsed.filter((entry): entry is string | number | boolean => entry !== null);
    return { kind: "compare", field: row.field, operator: row.operator, values };
  }

  if (
    row.operator === "is_null" ||
    row.operator === "is_not_null" ||
    row.operator === "in" ||
    row.operator === "not_in" ||
    row.operator === "between"
  )
    return null;

  const value = toScalar(row.value, row.fieldType);
  if (value === null) return null;
  return { kind: "compare", field: row.field, operator: row.operator, value };
}

/**
 * The rows as the tree the server stores, or `null` when they do not make one.
 *
 * A single row becomes a bare comparison rather than a one-child `and`. Both
 * compile identically, but the stored artefact is what somebody reads in a
 * support ticket, and `{"kind":"and","nodes":[…one…]}` invites the question of
 * what the missing sibling was.
 */
export function toSegmentCriteria(
  rows: readonly SegmentCriterionDraft[],
): SegmentFilterNode | null {
  const leaves: ReportingFilterLeaf[] = [];
  for (const row of rows) {
    const leaf = toLeaf(row);
    if (!leaf) return null;
    leaves.push(leaf);
  }

  const [only] = leaves;
  if (leaves.length === 0 || !only) return null;
  if (leaves.length === 1) return only;
  return { kind: "and", nodes: leaves };
}

function rowFromLeaf(
  leaf: ReportingFilterLeaf,
  typeOf: (field: string) => SegmentFieldType | undefined,
): SegmentCriterionDraft | null {
  const fieldType = typeOf(leaf.field);
  /**
   * A criterion naming a field this caller's catalogue does not carry. That
   * happens when the field has been withdrawn from the registry, or when the
   * reader holds a narrower grant than the author did. Either way the row cannot
   * be rendered honestly, so the whole tree is declined rather than shown with a
   * blank control that would silently drop the criterion on save.
   */
  if (!fieldType) return null;
  if (!SEGMENT_OPERATORS_FOR_TYPE[fieldType].includes(leaf.operator)) return null;

  const base = { field: leaf.field, fieldType, operator: leaf.operator };
  if ("values" in leaf)
    return { ...base, value: "", values: leaf.values.map(String).join("\n") };
  if ("value" in leaf) return { ...base, value: String(leaf.value), values: "" };
  return { ...base, value: "", values: "" };
}

/**
 * A stored tree as builder rows, or `null` when it is not one this control drew.
 *
 * The `null` is the honest half. A tree containing an `or`, a `not`, or nesting
 * cannot be represented as a flat conjunction, and flattening it would change
 * what the segment means while telling nobody. The caller shows the criteria
 * read-only and says where they came from.
 */
export function toCriterionRows(
  criteria: SegmentFilterNode,
  typeOf: (field: string) => SegmentFieldType | undefined,
): SegmentCriterionDraft[] | null {
  if (criteria.kind === "compare") {
    const row = rowFromLeaf(criteria, typeOf);
    return row ? [row] : null;
  }
  if (criteria.kind !== "and") return null;

  const rows: SegmentCriterionDraft[] = [];
  for (const node of criteria.nodes) {
    if (node.kind !== "compare") return null;
    const row = rowFromLeaf(node, typeOf);
    if (!row) return null;
    rows.push(row);
  }
  return rows.length > 0 ? rows : null;
}

/**
 * The criteria as a sentence, for a list row and a sheet header.
 *
 * Rendered from the tree rather than from the form, because the list never has
 * the form — and because a segment read by somebody who cannot edit it should
 * still say what it selects. Falls back to a count of criteria for a tree this
 * control cannot describe, which is honest about not knowing rather than
 * inventing a description.
 */
export function describeSegmentCriteria(
  criteria: SegmentFilterNode,
  labelOf: (field: string) => string,
): string {
  const parts = describeNode(criteria, labelOf);
  if (parts === null) return "Criteria built elsewhere";
  return parts;
}

function describeNode(
  node: SegmentFilterNode,
  labelOf: (field: string) => string,
): string | null {
  if (node.kind === "compare") {
    const label = labelOf(node.field);
    const operator = SEGMENT_OPERATOR_LABELS[node.operator];
    if ("values" in node) return `${label} ${operator} ${node.values.join(", ")}`;
    if ("value" in node) return `${label} ${operator} ${String(node.value)}`;
    return `${label} ${operator}`;
  }
  if (node.kind !== "and") return null;

  const described = node.nodes.map((child) => describeNode(child, labelOf));
  if (described.some((entry) => entry === null)) return null;
  return described.join(" · ");
}
