import type { TicketImportPreview, TicketImportReport } from "./import-export-contract";
import { failedRows } from "./import-preview-model";

export type ImportErrorStage = "preview" | "commit";

function cell(value: string | number | null): string {
  if (value === null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(header: readonly string[], rows: readonly (string | number | null)[][]): string {
  return [header.join(","), ...rows.map((row) => row.map(cell).join(","))].join("\n");
}

export function previewIssuesCsv(preview: TicketImportPreview): string {
  return toCsv(
    ["rowNumber", "field", "kind", "message"],
    preview.issues.map((issue) => [issue.rowNumber, issue.field, issue.kind, issue.message]),
  );
}

export function reportFailuresCsv(report: TicketImportReport): string {
  return toCsv(
    ["rowNumber", "outcome", "message"],
    failedRows(report).map((row) => [row.rowNumber, row.outcome, row.message]),
  );
}

export function errorReportFilename(projectId: number, stage: ImportErrorStage): string {
  return `build-project-${projectId}-import-${stage}-errors.csv`;
}
