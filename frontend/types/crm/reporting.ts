
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

export interface ReportingSourceField {
  readonly name: string;
  readonly label: string;
  readonly type: ReportingFieldType;
}

export interface ReportingSourceRelation {
  readonly name: string;
  readonly fields: readonly ReportingSourceField[];
}

export interface ReportingSource {
  readonly key: string;
  readonly label: string;
  readonly fields: readonly ReportingSourceField[];
  readonly relations: readonly ReportingSourceRelation[];
}

export interface ReportingCompiledColumn {
  readonly alias: string;
  readonly projection: ReportingProjection;
  readonly type: ReportingFieldType;
}

export interface ReportingRunResult {
  readonly columns: readonly ReportingCompiledColumn[];
  readonly rows: readonly Record<string, unknown>[];
  readonly rowCount: number;
  readonly truncated: boolean;
}

export interface ReportDefinitionSummary {
  readonly reportDefinitionId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly createdByUserId: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ReportDefinition {
  readonly reportDefinitionId: string;
  readonly organizationId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly queryDescription: ReportingQueryDescription;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateReportDefinitionInput {
  readonly name: string;
  readonly description?: string;
  readonly query: ReportingQueryDescription;
}

export interface UpdateReportDefinitionInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly query?: ReportingQueryDescription;
}

export interface RunReportDefinitionOverrides {
  readonly limit?: number;
  readonly offset?: number;
}

export interface ReportRunLogEntry {
  readonly reportRunId: string;
  readonly reportDefinitionId: string | null;
  readonly sourceKey: string;
  readonly compiledSql: string;
  readonly parameterCount: number;
  readonly rowCount: number | null;
  readonly durationMs: number | null;
  readonly ranByUserId: string | null;
  readonly ranByName: string | null;
  readonly createdAt: string;
}

export interface ReportingExplainResult {
  readonly source: string;
  readonly sql: string;
  readonly parameterCount: number;
  readonly columns: readonly ReportingCompiledColumn[];
}

export const REPORT_CADENCES = ["daily", "weekly", "monthly"] as const;
export type ReportCadence = (typeof REPORT_CADENCES)[number];

export const MAX_REPORT_DAY_OF_MONTH = 28;

export interface ReportSchedule {
  readonly reportScheduleId: string;
  readonly organizationId: string;
  readonly reportDefinitionId: string;
  readonly cadence: ReportCadence;
  readonly hourOfDay: number;
  readonly dayOfWeek: number;
  readonly dayOfMonth: number;
  readonly runAsUserId: string;
  readonly enabled: boolean;
  readonly runCount: number;
  readonly nextRunAt: string;
  readonly lastRunAt: string | null;
  readonly lastError: string | null;
  readonly createdByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly recipients: readonly string[];
}

export interface CreateReportScheduleInput {
  readonly reportDefinitionId: string;
  readonly cadence: ReportCadence;
  readonly hourOfDay: number;
  readonly dayOfWeek?: number;
  readonly dayOfMonth?: number;
  readonly recipients: readonly string[];
}

export interface UpdateReportScheduleInput {
  readonly cadence?: ReportCadence;
  readonly hourOfDay?: number;
  readonly dayOfWeek?: number;
  readonly dayOfMonth?: number;
  readonly enabled?: boolean;
  readonly recipients?: readonly string[];
}

export type ReportNlProposal =
  | {
      readonly accepted: true;
      readonly description: ReportingQueryDescription;
      readonly explanation: string;
      readonly preview: ReportingExplainResult;
    }
  | { readonly accepted: false; readonly reason: string };
