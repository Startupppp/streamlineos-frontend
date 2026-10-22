"use client";

import { CircleSlash, Info, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { AiUsageChip } from "@/components/ai/ai-usage-chip";
import { statusToneClasses } from "@/lib/design-tokens";
import { formatCalendarDate, formatDateTime } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import type {
  InvReportPreview,
  InvReportSpec,
} from "@/hooks/api/inventory/report-builder";
import { AiAnswerFeedback } from "./ai-answer-feedback";


const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function renderCell(value: string | number | null): string {
  if (value === null) return "—";
  if (typeof value === "number") return String(value);
  if (ISO_DATETIME.test(value)) return formatDateTime(value);
  if (ISO_DATE.test(value)) return formatCalendarDate(value);
  return value;
}

function describeFilters(spec: InvReportSpec): string | null {
  const entries = Object.entries(spec.filters);
  if (entries.length === 0) return null;
  return entries.map(([field, value]) => `${field}: ${String(value)}`).join(" · ");
}

function describeCoverage(preview: InvReportPreview): string {
  const rows = `${preview.rowCount} row${preview.rowCount === 1 ? "" : "s"}`;
  if (preview.total !== null && preview.total > preview.rowCount)
    return `Showing ${preview.rowCount} of ${preview.total} rows`;
  if (preview.truncated) return `Showing the first ${rows} — the report has more`;
  return rows;
}

function PlannedByNotice({ plannedBy }: { plannedBy: InvReportPreview["plannedBy"] }) {
  if (plannedBy === "model") return null;
  const tone = statusToneClasses("warning");
  return (
    <div
      className={cn("flex items-start gap-2 rounded-md border p-3", tone.surface, tone.rule)}
      role="status"
    >
      <TriangleAlert className={cn("mt-0.5 h-4 w-4 shrink-0", tone.ink)} aria-hidden />
      <p className={cn("text-dense", tone.ink)}>
        The assistant did not choose this report. It was picked by a keyword rule
        from the words in your question, so check that it is the report you meant
        before acting on it.
      </p>
    </div>
  );
}

function StrippedNotice({ stripped }: { stripped: InvReportPreview["stripped"] }) {
  if (stripped.length === 0) return null;
  const tone = statusToneClasses("info");
  return (
    <div
      className={cn("flex items-start gap-2 rounded-md border p-3", tone.surface, tone.rule)}
      role="status"
    >
      <Info className={cn("mt-0.5 h-4 w-4 shrink-0", tone.ink)} aria-hidden />
      <div className="space-y-1">
        <p className={cn("text-dense font-medium", tone.ink)}>
          {stripped.length === 1 ? "A filter was removed" : "Filters were removed"}
        </p>
        <ul className="space-y-0.5">
          {stripped.map((filter) => (
            <li key={filter.field} className={cn("text-dense", tone.ink)}>
              <span className="font-mono">{filter.field}</span> — {filter.reason}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function NotPermittedBody({ preview }: { preview: InvReportPreview }) {
  return (
    <EmptyState
      className="flex-1 min-h-0"
      illustrationPreset="inventory"
      title={`${preview.label} is not open to you`}
      description={
        preview.requiredPermission
          ? `That question resolved to the ${preview.label.toLowerCase()} report, which requires ${preview.requiredPermission}. Nothing was run — an empty table here would read as "there is nothing there", which is a different claim.`
          : `That question resolved to the ${preview.label.toLowerCase()} report, which you do not have permission to read. Nothing was run.`
      }
    />
  );
}

function assertNever(value: never): never {
  throw new Error(`report-builder-preview: unhandled status ${String(value)}`);
}

interface ReportBuilderPreviewProps {
  preview: InvReportPreview;
  onExport: (spec: InvReportSpec) => void;
  isExporting: boolean;
  exportError: unknown;
}

export function ReportBuilderPreview({
  preview,
  onExport,
  isExporting,
  exportError,
}: ReportBuilderPreviewProps) {
  const filters = describeFilters(preview.spec);

  const header = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{preview.label}</h3>
        <Badge variant="outline" className="text-micro">
          {preview.plannedBy === "model" ? "Chosen by the assistant" : "Keyword fallback"}
        </Badge>
        <AiUsageChip usage={preview.aiUsage ?? null} className="ml-auto" />
      </div>
      {filters ? (
        <p className="text-dense text-muted-foreground">
          Filters applied: <span className="font-mono">{filters}</span>
        </p>
      ) : null}
      <PlannedByNotice plannedBy={preview.plannedBy} />
      <StrippedNotice stripped={preview.stripped} />
    </div>
  );

  switch (preview.status) {
    case "not_permitted":
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {header}
          <NotPermittedBody preview={preview} />
        </div>
      );
    case "ok":
      return (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {header}

          {preview.rowCount === 0 ? (
            <EmptyState
              className="flex-1 min-h-0"
              illustrationPreset="inventory"
              title="Nothing matched"
              description="The report ran and returned no rows in the warehouses you can see. That is an answer, not a failure."
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {preview.columns.map((column) => (
                      <TableHead
                        key={column.key}
                        className={column.numeric ? "text-right" : undefined}
                      >
                        {column.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, index) => (
                    <TableRow key={`${preview.spec.report}-${index}`}>
                      {preview.columns.map((column) => (
                        <TableCell
                          key={column.key}
                          className={
                            column.numeric
                              ? "text-right font-mono tabular-nums"
                              : "max-w-xs truncate"
                          }
                        >
                          {renderCell(row[column.key] ?? null)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-dense tabular-nums text-muted-foreground">
              {describeCoverage(preview)}
            </span>
            {preview.canExport ? (
              <LoadingButton
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                isPending={isExporting}
                loadingText="Preparing…"
                onClick={() => onExport(preview.spec)}
              >
                Export CSV
              </LoadingButton>
            ) : (
              <span className="ml-auto inline-flex items-center gap-1.5 text-dense text-muted-foreground">
                <CircleSlash className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Export needs a permission you do not hold
              </span>
            )}
          </div>

          {preview.truncated && preview.canExport ? (
            <p className="text-dense text-muted-foreground">
              The file re-runs this report on the server. It can hold more rows
              than the preview above, and it is bounded too.
            </p>
          ) : null}

          {exportError ? (
            <p className="text-dense text-destructive" role="alert">
              {getErrorMessage(exportError)}
            </p>
          ) : null}

          <AiAnswerFeedback surface="report_builder" provenance={preview.provenance} />
        </div>
      );
    default:
      return assertNever(preview.status);
  }
}
