import {
  REPORTING_LIST_OPERATORS,
  REPORTING_UNARY_OPERATORS,
  type ReportingAggregate,
  type ReportingComparisonOperator,
  type ReportingFieldType,
} from "@/types/crm/reporting";

/**
 * Every bound the server refuses on, restated so the builder can refuse first.
 *
 * `compileQuery` re-checks all of this and is the actual gate; the point of the
 * copy is that a control which lets somebody assemble a query the compiler will
 * reject has taught them nothing. Sourced from `compiler/query-description.ts`
 * (`QUERY_LIMITS`) and `compiler/compile.ts` (the per-type tables).
 */
export const REPORT_QUERY_LIMITS = {
  maxSelect: 40,
  maxFilterNodes: 100,
  maxFilterDepth: 6,
  maxInValues: 200,
  maxGroupBy: 10,
  maxOrderBy: 5,
  maxLimit: 1000,
  maxOffset: 100_000,
  maxValueLength: 1000,
} as const;

/**
 * The one bound that is not in `QUERY_LIMITS`.
 *
 * `dto/reporting.schemas.ts` caps the children of an `and`/`or` at
 * `MAX_BRANCHES = 20`, independently of `maxFilterNodes`. The builder emits one
 * flat `and`, so this — not 100 — is the number of filters it may carry.
 */
export const REPORT_MAX_FILTER_BRANCHES = 20;

/** Length of an ISO string `checkValue` will still parse. */
export const REPORT_MAX_DATE_VALUE_LENGTH = 40;

/** `OPERATORS_FOR_TYPE` in `compiler/compile.ts`. */
export const REPORT_OPERATORS_FOR_TYPE: Record<
  ReportingFieldType,
  readonly ReportingComparisonOperator[]
> = {
  text: [
    ...REPORTING_UNARY_OPERATORS,
    "eq",
    "ne",
    "lt",
    "lte",
    "gt",
    "gte",
    "contains",
    "starts_with",
    "ends_with",
    ...REPORTING_LIST_OPERATORS,
    "between",
  ],
  enum: [...REPORTING_UNARY_OPERATORS, "eq", "ne", ...REPORTING_LIST_OPERATORS],
  number: [
    ...REPORTING_UNARY_OPERATORS,
    "eq",
    "ne",
    "lt",
    "lte",
    "gt",
    "gte",
    ...REPORTING_LIST_OPERATORS,
    "between",
  ],
  timestamp: [...REPORTING_UNARY_OPERATORS, "eq", "ne", "lt", "lte", "gt", "gte", "between"],
  date: [...REPORTING_UNARY_OPERATORS, "eq", "ne", "lt", "lte", "gt", "gte", "between"],
  boolean: [...REPORTING_UNARY_OPERATORS, "eq", "ne"],
};

/** `AGGREGATE_RULES` in `compiler/compile.ts`, inverted per field type. */
export const REPORT_AGGREGATES_FOR_TYPE: Record<
  ReportingFieldType,
  readonly ReportingAggregate[]
> = {
  text: ["count", "count_distinct", "min", "max"],
  enum: ["count", "count_distinct"],
  number: ["count", "count_distinct", "sum", "avg", "min", "max"],
  boolean: ["count", "count_distinct"],
  timestamp: ["count", "count_distinct", "min", "max"],
  date: ["count", "count_distinct", "min", "max"],
};

export const REPORT_OPERATOR_LABELS: Record<ReportingComparisonOperator, string> = {
  is_null: "is empty",
  is_not_null: "is not empty",
  eq: "equals",
  ne: "does not equal",
  lt: "is less than",
  lte: "is at most",
  gt: "is greater than",
  gte: "is at least",
  contains: "contains",
  starts_with: "starts with",
  ends_with: "ends with",
  in: "is any of",
  not_in: "is none of",
  between: "is between",
};

export const REPORT_AGGREGATE_LABELS: Record<ReportingAggregate, string> = {
  count: "Count",
  count_distinct: "Distinct count",
  sum: "Sum",
  avg: "Average",
  min: "Minimum",
  max: "Maximum",
};

export type ReportOperatorArity = "unary" | "binary" | "list" | "range";

export function operatorArity(operator: ReportingComparisonOperator): ReportOperatorArity {
  if (operator === "is_null" || operator === "is_not_null") return "unary";
  if (operator === "in" || operator === "not_in") return "list";
  if (operator === "between") return "range";
  return "binary";
}
