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

/**
 * One row of `GET /crm/reporting/definitions` — the saved-report list.
 *
 * The stored description is deliberately absent: the list screen never needs
 * it, and it is the largest field on the row.
 */
export interface ReportDefinitionSummary {
  readonly reportDefinitionId: string;
  readonly name: string;
  readonly description: string | null;
  readonly sourceKey: string;
  readonly createdByUserId: string | null;
  /** Projected from `users.name` by a LEFT JOIN; null for a deleted author. */
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * `GET /crm/reporting/definitions/:reportDefinitionId`, which returns the whole
 * stored row.
 *
 * Deliberately not an extension of the summary: the list projects an author
 * name through a join and the row read does not, so inheriting would claim a
 * field the detail response has never carried.
 */
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

/**
 * `description: null` clears it, `undefined` leaves it alone — the update
 * schema is `.nullable().optional()` and the two mean different things.
 */
export interface UpdateReportDefinitionInput {
  readonly name?: string;
  readonly description?: string | null;
  readonly query?: ReportingQueryDescription;
}

/** Overrides accepted by `POST definitions/:reportDefinitionId/run`. */
export interface RunReportDefinitionOverrides {
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * One row of `GET /crm/reporting/runs`.
 *
 * `compiledSql` carries placeholders and no literals, which is what makes this
 * readable by somebody holding only `crm:reporting:view` — the audit read is
 * separable from a view of the data precisely because the statement is
 * content-free.
 */
export interface ReportRunLogEntry {
  readonly reportRunId: string;
  readonly reportDefinitionId: string | null;
  readonly sourceKey: string;
  readonly compiledSql: string;
  readonly parameterCount: number;
  readonly rowCount: number | null;
  readonly durationMs: number | null;
  readonly ranByUserId: string | null;
  /** Projected from `users.name`, so the log names a person and not an id. */
  readonly ranByName: string | null;
  readonly createdAt: string;
}

/** `POST /crm/reporting/explain` — what would run, without running it. */
export interface ReportingExplainResult {
  readonly source: string;
  readonly sql: string;
  /** The count, never the values. The server refuses to echo the parameters. */
  readonly parameterCount: number;
  readonly columns: readonly ReportingCompiledColumn[];
}

export const REPORT_CADENCES = ["daily", "weekly", "monthly"] as const;
export type ReportCadence = (typeof REPORT_CADENCES)[number];

/** 29-31 are refused, never clamped — see `report-schedule-cadence.ts`. */
export const MAX_REPORT_DAY_OF_MONTH = 28;

/**
 * One row of `GET /crm/reporting/schedules`.
 *
 * `runAsUserId` is not decoration. A schedule has no requester when it fires,
 * so it names one, and the unattended run carries that person's permissions and
 * DataScope — which is why a schedule stops delivering when its owner's access
 * to the source is withdrawn, and why `lastError` exists to say so.
 */
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

/**
 * `POST /crm/reporting/nl-propose` — a plain-language question, proposed as
 * a query description, never run. Mirrors the backend's discriminated union
 * exactly: `accepted` carries the same shape `ReportingExplainResult` does
 * (a compile preview, never rows) alongside the description that produced
 * it, so the builder form can be pre-filled from one response.
 */
export type ReportNlProposal =
  | {
      readonly accepted: true;
      readonly description: ReportingQueryDescription;
      readonly explanation: string;
      readonly preview: ReportingExplainResult;
    }
  | { readonly accepted: false; readonly reason: string };
