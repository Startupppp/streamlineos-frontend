import type {
  ReportingFieldType,
  ReportingFilterLeaf,
  ReportingFilterNode,
  ReportingProjection,
  ReportingQueryDescription,
  ReportingScalarValue,
} from "@/types/crm/reporting";
import {
  NO_AGGREGATE,
  splitListValues,
  type ReportBuilderValues,
  type ReportFilterRow,
} from "./report-builder-schema";

/**
 * Form values to the description the compiler reads.
 *
 * Total by construction: every string that reaches it has already been checked
 * against its field type by `reportBuilderSchema`, so there is no failure arm
 * and therefore no place for a submit handler to silently do nothing.
 */

function coerceScalar(raw: string, type: ReportingFieldType): ReportingScalarValue {
  const trimmed = raw.trim();
  if (type === "number") return Number(trimmed);
  if (type === "boolean") return trimmed === "true";
  return trimmed;
}

function toProjection(row: ReportBuilderValues["select"][number]): ReportingProjection {
  if (row.aggregate === NO_AGGREGATE) return { kind: "field", field: row.field };
  if (row.field === "") return { kind: "aggregate", aggregate: row.aggregate };
  return { kind: "aggregate", aggregate: row.aggregate, field: row.field };
}

function toFilterLeaf(row: ReportFilterRow): ReportingFilterLeaf | null {
  if (row.fieldType === "" || row.field === "") return null;
  const type = row.fieldType;

  switch (row.operator) {
    case "is_null":
    case "is_not_null":
      return { kind: "compare", field: row.field, operator: row.operator };
    case "in":
    case "not_in":
      return {
        kind: "compare",
        field: row.field,
        operator: row.operator,
        values: splitListValues(row.values).map((entry) => coerceScalar(entry, type)),
      };
    case "between":
      return {
        kind: "compare",
        field: row.field,
        operator: row.operator,
        from: coerceScalar(row.from, type),
        to: coerceScalar(row.to, type),
      };
    default:
      return {
        kind: "compare",
        field: row.field,
        operator: row.operator,
        value: coerceScalar(row.value, type),
      };
  }
}

/**
 * One flat `and`, never a bare leaf.
 *
 * A single leaf would also be accepted, but emitting the same shape for one
 * filter and for five means the depth the builder can produce is a constant —
 * two — rather than something a reader has to derive from the row count, and
 * `maxFilterDepth` is six.
 */
function toFilterNode(values: ReportBuilderValues): ReportingFilterNode | undefined {
  const leaves = values.filters
    .map(toFilterLeaf)
    .filter((leaf): leaf is ReportingFilterLeaf => leaf !== null);
  if (leaves.length === 0) return undefined;
  return { kind: "and", nodes: leaves };
}

export function buildQueryDescription(
  values: ReportBuilderValues,
): ReportingQueryDescription {
  const filter = toFilterNode(values);
  return {
    source: values.source,
    select: values.select.map(toProjection),
    ...(filter === undefined ? {} : { filter }),
    ...(values.groupBy.length === 0 ? {} : { groupBy: values.groupBy }),
    ...(values.orderBy.length === 0
      ? {}
      : { orderBy: values.orderBy.map((row) => ({ select: row.select, direction: row.direction })) }),
    limit: values.limit,
    ...(values.offset === 0 ? {} : { offset: values.offset }),
  };
}
