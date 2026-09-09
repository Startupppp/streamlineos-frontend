import { formatShortDate } from "@/lib/date-utils";
import type { DataTableColumn } from "@/components/ui/data-table";
import type {
  ReportingCompiledColumn,
  ReportingFieldType,
  ReportingProjection,
} from "@/types/crm/reporting";
import { REPORT_AGGREGATE_LABELS } from "./report-query-limits";
import { fieldLabel, type ReportFieldOption } from "./report-source-fields";

export type ReportResultRow = Record<string, unknown>;

/**
 * A returned column is joined to its meaning by `alias`, never by position.
 *
 * The compiler generates `c0`, `c1`, … precisely so that no caller-supplied
 * string becomes an identifier, and it hands the projections back separately so
 * the caller can put its own labels on them.
 */
export function resultColumnHeader(
  projection: ReportingProjection,
  options: readonly ReportFieldOption[],
): string {
  if (projection.kind === "field") return fieldLabel(options, projection.field);
  if (projection.field === undefined) return `${REPORT_AGGREGATE_LABELS[projection.aggregate]} of rows`;
  return `${REPORT_AGGREGATE_LABELS[projection.aggregate]} of ${fieldLabel(options, projection.field)}`;
}

export function formatResultCell(value: unknown, type: ReportingFieldType): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (type === "date" || type === "timestamp") {
    const rendered = formatShortDate(typeof value === "string" ? value : String(value));
    return rendered === "" ? String(value) : rendered;
  }
  if (type === "number") {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString("en-IN") : String(value);
  }
  return String(value);
}

export function buildResultColumns(
  columns: readonly ReportingCompiledColumn[],
  options: readonly ReportFieldOption[],
): DataTableColumn<ReportResultRow>[] {
  return columns.map((column) => ({
    key: column.alias,
    header: resultColumnHeader(column.projection, options),
    className: column.type === "number" ? "font-mono tabular-nums text-right" : "truncate",
    headerClassName: column.type === "number" ? "text-right" : undefined,
    cell: (row) => formatResultCell(row[column.alias], column.type),
  }));
}
