import type {
  ReportingComparisonOperator,
  ReportingFieldType,
  ReportingFilterLeaf,
  ReportingFilterNode,
} from "@/types/crm/reporting";


export const SEGMENT_OPERATORS_FOR_TYPE: Record<
  ReportingFieldType,
  readonly ReportingComparisonOperator[]
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

export const SEGMENT_OPERATOR_LABELS: Record<ReportingComparisonOperator, string> = {
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

export function segmentOperatorArity(operator: ReportingComparisonOperator): SegmentOperatorArity {
  if (operator === "is_null" || operator === "is_not_null") return "unary";
  if (operator === "in" || operator === "not_in") return "list";
  return "binary";
}

export interface SegmentCriterionDraft {
  field: string;
  fieldType: ReportingFieldType | "";
  operator: ReportingComparisonOperator;
  value: string;
  values: string;
}

export const EMPTY_CRITERION_ROW: SegmentCriterionDraft = {
  field: "",
  fieldType: "",
  operator: "eq",
  value: "",
  values: "",
};

export function splitCriterionValues(raw: string): string[] {
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

export function toScalar(
  raw: string,
  type: ReportingFieldType,
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

export function toSegmentCriteria(
  rows: readonly SegmentCriterionDraft[],
): ReportingFilterNode | null {
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
  typeOf: (field: string) => ReportingFieldType | undefined,
): SegmentCriterionDraft | null {
  const fieldType = typeOf(leaf.field);
  if (!fieldType) return null;
  if (!SEGMENT_OPERATORS_FOR_TYPE[fieldType].includes(leaf.operator)) return null;

  const base = { field: leaf.field, fieldType, operator: leaf.operator };
  if ("values" in leaf)
    return { ...base, value: "", values: leaf.values.map(String).join("\n") };
  if ("value" in leaf) return { ...base, value: String(leaf.value), values: "" };
  return { ...base, value: "", values: "" };
}

export function toCriterionRows(
  criteria: ReportingFilterNode,
  typeOf: (field: string) => ReportingFieldType | undefined,
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

export function describeSegmentCriteria(
  criteria: ReportingFilterNode,
  labelOf: (field: string) => string,
): string {
  const parts = describeNode(criteria, labelOf);
  if (parts === null) return "Criteria built elsewhere";
  return parts;
}

function describeNode(
  node: ReportingFilterNode,
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
