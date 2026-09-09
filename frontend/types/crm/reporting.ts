/**
 * The wire contract of `@Controller("crm/reporting")`.
 *
 * Mirrors `src/modules/reporting/compiler/query-description.ts` and
 * `dto/reporting.schemas.ts` field for field. The request body is `.strict()`
 * on every object, so an extra key is a 400 rather than a silently dropped
 * field — which is the one drift this file exists to prevent.
 */

export const REPORTING_FIELD_TYPES = [
  "text",
  "enum",
  "number",
  "boolean",
  "timestamp",
  "date",
] as const;
export type ReportingFieldType = (typeof REPORTING_FIELD_TYPES)[number];

export const REPORTING_UNARY_OPERATORS = ["is_null", "is_not_null"] as const;
export const REPORTING_BINARY_OPERATORS = [
  "eq",
  "ne",
  "lt",
  "lte",
  "gt",
  "gte",
  "contains",
  "starts_with",
  "ends_with",
] as const;
export const REPORTING_LIST_OPERATORS = ["in", "not_in"] as const;
export const REPORTING_RANGE_OPERATORS = ["between"] as const;

export const REPORTING_COMPARISON_OPERATORS = [
  ...REPORTING_UNARY_OPERATORS,
  ...REPORTING_BINARY_OPERATORS,
  ...REPORTING_LIST_OPERATORS,
  ...REPORTING_RANGE_OPERATORS,
] as const;
export type ReportingUnaryOperator = (typeof REPORTING_UNARY_OPERATORS)[number];
export type ReportingBinaryOperator = (typeof REPORTING_BINARY_OPERATORS)[number];
export type ReportingListOperator = (typeof REPORTING_LIST_OPERATORS)[number];
export type ReportingRangeOperator = (typeof REPORTING_RANGE_OPERATORS)[number];
export type ReportingComparisonOperator =
  (typeof REPORTING_COMPARISON_OPERATORS)[number];

export const REPORTING_AGGREGATES = [
  "count",
  "count_distinct",
  "sum",
  "avg",
  "min",
  "max",
] as const;
export type ReportingAggregate = (typeof REPORTING_AGGREGATES)[number];

export const REPORTING_SORT_DIRECTIONS = ["asc", "desc"] as const;
export type ReportingSortDirection = (typeof REPORTING_SORT_DIRECTIONS)[number];

export type ReportingScalarValue = string | number | boolean;

export type ReportingFilterLeaf =
  | { kind: "compare"; field: string; operator: ReportingUnaryOperator }
  | {
      kind: "compare";
      field: string;
      operator: ReportingBinaryOperator;
      value: ReportingScalarValue;
    }
  | {
      kind: "compare";
      field: string;
      operator: ReportingListOperator;
      values: readonly ReportingScalarValue[];
    }
  | {
      kind: "compare";
      field: string;
      operator: ReportingRangeOperator;
      from: ReportingScalarValue;
      to: ReportingScalarValue;
    };

export type ReportingFilterNode =
  | ReportingFilterLeaf
  | { kind: "and"; nodes: readonly ReportingFilterNode[] }
  | { kind: "or"; nodes: readonly ReportingFilterNode[] }
  | { kind: "not"; node: ReportingFilterNode };

export type ReportingProjection =
  | { kind: "field"; field: string }
  | { kind: "aggregate"; aggregate: ReportingAggregate; field?: string };

export interface ReportingSortSpec {
  readonly select: number;
  readonly direction: ReportingSortDirection;
}

export interface ReportingQueryDescription {
  readonly source: string;
  readonly select: readonly ReportingProjection[];
  readonly filter?: ReportingFilterNode;
  readonly groupBy?: readonly string[];
  readonly orderBy?: readonly ReportingSortSpec[];
  readonly limit: number;
  readonly offset?: number;
}

/** One entry of `GET /crm/reporting/sources`. */
export interface ReportingSourceField {
  readonly name: string;
  readonly label: string;
  readonly type: ReportingFieldType;
}

export interface ReportingSourceRelation {
  readonly name: string;
  /** Already dotted — `party.industry` — so it is usable as a field name verbatim. */
  readonly fields: readonly ReportingSourceField[];
}

export interface ReportingSource {
  readonly key: string;
  readonly label: string;
  readonly fields: readonly ReportingSourceField[];
  readonly relations: readonly ReportingSourceRelation[];
}

/**
 * A returned column. `alias` is the generated `c0`, `c1`, … key the row objects
 * carry; the caller joins its own labels to the rows through it.
 */
export interface ReportingCompiledColumn {
  readonly alias: string;
  readonly projection: ReportingProjection;
  readonly type: ReportingFieldType;
}

export interface ReportingRunResult {
  readonly columns: readonly ReportingCompiledColumn[];
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number;
  /** The page came back full, so there may be more behind it. */
  readonly truncated: boolean;
}
