import { z } from "zod";
import {
  REPORTING_AGGREGATES,
  REPORTING_COMPARISON_OPERATORS,
  REPORTING_FIELD_TYPES,
  REPORTING_SORT_DIRECTIONS,
  type ReportingFieldType,
} from "@/types/crm/reporting";
import {
  operatorArity,
  REPORT_AGGREGATES_FOR_TYPE,
  REPORT_MAX_DATE_VALUE_LENGTH,
  REPORT_MAX_FILTER_BRANCHES,
  REPORT_OPERATORS_FOR_TYPE,
  REPORT_QUERY_LIMITS,
} from "./report-query-limits";

/**
 * What the builder lets somebody assemble, and nothing the compiler would then
 * refuse.
 *
 * The form carries a `fieldType` beside every chosen field so that the rules
 * which are per-type on the server — which operators apply, which aggregates
 * apply, what a value has to look like — are decidable here without the schema
 * having to reach for the source catalogue. Whoever sets `field` sets
 * `fieldType` in the same change; changing the source clears both.
 */

export const NO_AGGREGATE = "none" as const;

const NUL_BYTE = String.fromCharCode(0);

const fieldTypeSchema = z.enum(REPORTING_FIELD_TYPES);

export const projectionRowSchema = z.object({
  aggregate: z.union([z.literal(NO_AGGREGATE), z.enum(REPORTING_AGGREGATES)]),
  field: z.string(),
  fieldType: z.union([z.literal(""), fieldTypeSchema]),
});

export const filterRowSchema = z.object({
  field: z.string(),
  fieldType: z.union([z.literal(""), fieldTypeSchema]),
  operator: z.enum(REPORTING_COMPARISON_OPERATORS),
  value: z.string(),
  values: z.string(),
  from: z.string(),
  to: z.string(),
});

export const sortRowSchema = z.object({
  select: z.number().int().min(0),
  direction: z.enum(REPORTING_SORT_DIRECTIONS),
});

const baseSchema = z.object({
  source: z.string().min(1, "Pick something to report on"),
  select: z
    .array(projectionRowSchema)
    .min(1, "A report needs at least one column")
    .max(REPORT_QUERY_LIMITS.maxSelect, `At most ${REPORT_QUERY_LIMITS.maxSelect} columns`),
  groupBy: z
    .array(z.string().min(1))
    .max(REPORT_QUERY_LIMITS.maxGroupBy, `At most ${REPORT_QUERY_LIMITS.maxGroupBy} grouping keys`),
  filters: z
    .array(filterRowSchema)
    .max(REPORT_MAX_FILTER_BRANCHES, `At most ${REPORT_MAX_FILTER_BRANCHES} filters`),
  orderBy: z
    .array(sortRowSchema)
    .max(REPORT_QUERY_LIMITS.maxOrderBy, `At most ${REPORT_QUERY_LIMITS.maxOrderBy} sort keys`),
  limit: z
    .number()
    .int("Whole rows only")
    .min(1, "At least one row")
    .max(REPORT_QUERY_LIMITS.maxLimit, `At most ${REPORT_QUERY_LIMITS.maxLimit} rows per run`),
  offset: z
    .number()
    .int("Whole rows only")
    .min(0, "Cannot skip a negative number of rows")
    .max(REPORT_QUERY_LIMITS.maxOffset, `Cannot page past row ${REPORT_QUERY_LIMITS.maxOffset}`),
});

export type ReportBuilderValues = z.infer<typeof baseSchema>;
export type ReportProjectionRow = z.infer<typeof projectionRowSchema>;
export type ReportFilterRow = z.infer<typeof filterRowSchema>;
export type ReportSortRow = z.infer<typeof sortRowSchema>;

/** What the server's `checkValue` will accept for this type, asked early. */
export function scalarValueProblem(raw: string, type: ReportingFieldType): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return "A value is required";

  switch (type) {
    case "text":
    case "enum":
      if (trimmed.includes(NUL_BYTE)) return "A value cannot contain a NUL byte";
      if (trimmed.length > REPORT_QUERY_LIMITS.maxValueLength)
        return `At most ${REPORT_QUERY_LIMITS.maxValueLength} characters`;
      return null;
    case "number":
      if (!Number.isFinite(Number(trimmed))) return "Enter a finite number";
      return null;
    case "boolean":
      if (trimmed !== "true" && trimmed !== "false") return "Choose true or false";
      return null;
    case "timestamp":
    case "date":
      if (trimmed.length > REPORT_MAX_DATE_VALUE_LENGTH || Number.isNaN(Date.parse(trimmed)))
        return "Enter a date the server can parse";
      return null;
  }
}

/** `in`/`not_in` lists are one value per line, so a value may contain a comma. */
export function splitListValues(raw: string): string[] {
  return raw
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}

function checkProjections(values: ReportBuilderValues, ctx: z.RefinementCtx): void {
  values.select.forEach((row, index) => {
    const path = ["select", index] as const;
    const fieldIsOptional = row.aggregate === "count";
    if (row.field === "" || row.fieldType === "") {
      if (!fieldIsOptional)
        ctx.addIssue({ code: "custom", message: "Pick a field", path: [...path, "field"] });
      return;
    }
    if (row.aggregate === NO_AGGREGATE) return;
    if (!REPORT_AGGREGATES_FOR_TYPE[row.fieldType].includes(row.aggregate))
      ctx.addIssue({
        code: "custom",
        message: `${row.aggregate} does not apply to a ${row.fieldType} field`,
        path: [...path, "aggregate"],
      });
  });
}

/**
 * The SQL grouping rule, checked here for the reason `assertGroupingIsValid`
 * gives: Postgres would say the same thing, hours later, to somebody who is no
 * longer looking at the control that caused it.
 */
function checkGrouping(values: ReportBuilderValues, ctx: z.RefinementCtx): void {
  const hasAggregate = values.select.some((row) => row.aggregate !== NO_AGGREGATE);
  if (!hasAggregate) return;

  const grouped = new Set(values.groupBy);
  const ungrouped = values.select
    .filter((row) => row.aggregate === NO_AGGREGATE && row.field !== "" && !grouped.has(row.field))
    .map((row) => row.field);

  if (ungrouped.length > 0)
    ctx.addIssue({
      code: "custom",
      message: `Group by ${ungrouped.join(", ")}, or aggregate them — a plain column cannot sit beside an aggregate`,
      path: ["groupBy"],
    });
}

function checkFilterValue(row: ReportFilterRow, index: number, ctx: z.RefinementCtx): void {
  if (row.fieldType === "") return;
  const arity = operatorArity(row.operator);
  const path = ["filters", index] as const;

  if (arity === "unary") return;

  if (arity === "binary") {
    const problem = scalarValueProblem(row.value, row.fieldType);
    if (problem) ctx.addIssue({ code: "custom", message: problem, path: [...path, "value"] });
    return;
  }

  if (arity === "range") {
    const fromProblem = scalarValueProblem(row.from, row.fieldType);
    if (fromProblem) ctx.addIssue({ code: "custom", message: fromProblem, path: [...path, "from"] });
    const toProblem = scalarValueProblem(row.to, row.fieldType);
    if (toProblem) ctx.addIssue({ code: "custom", message: toProblem, path: [...path, "to"] });
    return;
  }

  const entries = splitListValues(row.values);
  if (entries.length === 0) {
    ctx.addIssue({ code: "custom", message: "Add at least one value", path: [...path, "values"] });
    return;
  }
  if (entries.length > REPORT_QUERY_LIMITS.maxInValues) {
    ctx.addIssue({
      code: "custom",
      message: `At most ${REPORT_QUERY_LIMITS.maxInValues} values`,
      path: [...path, "values"],
    });
    return;
  }
  const fieldType = row.fieldType;
  const problem = entries
    .map((entry) => scalarValueProblem(entry, fieldType))
    .find((entry) => entry !== null);
  if (problem) ctx.addIssue({ code: "custom", message: problem, path: [...path, "values"] });
}

function checkFilters(values: ReportBuilderValues, ctx: z.RefinementCtx): void {
  values.filters.forEach((row, index) => {
    const path = ["filters", index] as const;
    if (row.field === "" || row.fieldType === "") {
      ctx.addIssue({ code: "custom", message: "Pick a field", path: [...path, "field"] });
      return;
    }
    if (!REPORT_OPERATORS_FOR_TYPE[row.fieldType].includes(row.operator)) {
      ctx.addIssue({
        code: "custom",
        message: `${row.operator} does not apply to a ${row.fieldType} field`,
        path: [...path, "operator"],
      });
      return;
    }
    checkFilterValue(row, index, ctx);
  });
}

/**
 * Sorting names an index into `select`, never a field — the server refuses a
 * sort on a column the caller did not project, because repeated queries ordered
 * by an unseen column reconstruct it.
 */
function checkSorting(values: ReportBuilderValues, ctx: z.RefinementCtx): void {
  values.orderBy.forEach((row, index) => {
    if (row.select >= values.select.length)
      ctx.addIssue({
        code: "custom",
        message: "Sort on a column this report returns",
        path: ["orderBy", index, "select"],
      });
  });
}

export const reportBuilderSchema = baseSchema.superRefine((values, ctx) => {
  checkProjections(values, ctx);
  checkGrouping(values, ctx);
  checkFilters(values, ctx);
  checkSorting(values, ctx);
});

export const EMPTY_FILTER_ROW: ReportFilterRow = {
  field: "",
  fieldType: "",
  operator: "eq",
  value: "",
  values: "",
  from: "",
  to: "",
};

export const EMPTY_PROJECTION_ROW: ReportProjectionRow = {
  aggregate: NO_AGGREGATE,
  field: "",
  fieldType: "",
};

export const DEFAULT_REPORT_BUILDER_VALUES: ReportBuilderValues = {
  source: "",
  select: [EMPTY_PROJECTION_ROW],
  groupBy: [],
  filters: [],
  orderBy: [],
  limit: 100,
  offset: 0,
};
