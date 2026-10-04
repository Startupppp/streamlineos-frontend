import type {
  TicketImportExportPreviewImportResponse,
  TicketImportExportCommitImportResponse,
} from "@/contracts/build-contracts.generated";
import type {
  ImportIssueKind,
  ImportRowIssue,
  ImportRowResult,
} from "./import-export-contract";

export type PreviewRowState = "IMPORTABLE" | ImportIssueKind;

export interface PreviewRowView {
  rowNumber: number;
  title: string | null;
  state: PreviewRowState;
  issues: ImportRowIssue[];
}

const STATE_ORDER: Record<PreviewRowState, number> = {
  INVALID: 0,
  DUPLICATE_IN_FILE: 1,
  DUPLICATE_EXISTING: 2,
  IMPORTABLE: 3,
};

function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function issuesByRow(preview: TicketImportExportPreviewImportResponse): Map<number, ImportRowIssue[]> {
  const grouped = new Map<number, ImportRowIssue[]>();
  for (const issue of preview.issues) {
    const existing = grouped.get(issue.rowNumber);
    if (existing) existing.push(issue);
    else grouped.set(issue.rowNumber, [issue]);
  }
  return grouped;
}

export function toPreviewRowViews(preview: TicketImportExportPreviewImportResponse): PreviewRowView[] {
  const grouped = issuesByRow(preview);
  const views: PreviewRowView[] = preview.rows.map((row) => ({
    rowNumber: row.rowNumber,
    title: row.values.title,
    state: "IMPORTABLE",
    issues: [],
  }));

  for (const [rowNumber, issues] of grouped) {
    views.push({
      rowNumber,
      title: null,
      state: issues[0]?.kind ?? "INVALID",
      issues,
    });
  }

  return views.sort((a, b) => a.rowNumber - b.rowNumber);
}

export function rowsNeedingAttention(preview: TicketImportExportPreviewImportResponse): PreviewRowView[] {
  return toPreviewRowViews(preview)
    .filter((view) => view.state !== "IMPORTABLE")
    .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.rowNumber - b.rowNumber);
}

export function fieldsWithIssues(preview: TicketImportExportPreviewImportResponse): { field: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const issue of preview.issues) {
    if (!issue.field) continue;
    counts.set(issue.field, (counts.get(issue.field) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field));
}

export function canCommit(preview: TicketImportExportPreviewImportResponse): boolean {
  return preview.fileError === null && preview.confirmationToken !== null;
}

export function previewHeadline(preview: TicketImportExportPreviewImportResponse): string {
  if (preview.fileError) return preview.fileError;
  const { importable, invalid, duplicateInFile, duplicateExisting } = preview.summary;
  const skipped = invalid + duplicateInFile + duplicateExisting;
  if (importable === 0) return `Nothing to import — ${pluralize(skipped, "row")} need attention`;
  if (skipped === 0) return `${pluralize(importable, "row")} ready to import`;
  return `${pluralize(importable, "row")} ready to import, ${skipped} skipped`;
}

export function reportHeadline(report: TicketImportExportCommitImportResponse): string {
  if (report.replayed) return `Already imported — ${pluralize(report.summary.imported, "row")}`;
  if (report.summary.rolledBack > 0)
    return `Import rolled back — no row was written`;
  const parts = [`${pluralize(report.summary.imported, "row")} imported`];
  if (report.summary.failed > 0) parts.push(`${report.summary.failed} failed`);
  if (report.summary.skipped > 0) parts.push(`${report.summary.skipped} skipped`);
  return parts.join(", ");
}

export function failedRows(report: TicketImportExportCommitImportResponse): ImportRowResult[] {
  return report.rows.filter(
    (row) => row.outcome === "FAILED" || row.outcome === "ROLLED_BACK",
  );
}
