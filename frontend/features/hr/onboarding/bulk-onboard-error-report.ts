import { downloadXlsx } from "@/lib/export/xlsx-utils";
import { isCommittable, type BulkOnboardCommit, type BulkOnboardFlowRow } from "./use-bulk-onboard-flow";

export interface BulkOnboardErrorReportRow {
  row: number;
  email: string;
  status: string;
  codes: string;
  details: string;
}

/**
 * Every row that did not become an employee, keyed by its row in the uploaded
 * file: rows the client check refused, rows the server preview held back
 * (ERROR, SKIPPED), and rows the commit itself failed or skipped. A WARNING row
 * that was created is not an error and is not listed.
 */
export function buildBulkOnboardErrorReportRows(
  rows: BulkOnboardFlowRow[],
  commit: BulkOnboardCommit | null,
): BulkOnboardErrorReportRow[] {
  const report: BulkOnboardErrorReportRow[] = [];
  for (const row of rows) {
    // Ready/warning rows were submitted; the commit results below speak for them.
    if (isCommittable(row)) continue;
    const clientErrors = row.preview.errors;
    report.push({
      row: row.fileRow,
      email: row.preview.email,
      status: clientErrors.length > 0 ? "ERROR" : (row.server?.status ?? "NOT_CHECKED"),
      codes: (row.server?.codes ?? []).join(", "),
      details: (clientErrors.length > 0 ? clientErrors : (row.server?.messages ?? [])).join("; "),
    });
  }
  for (const result of commit?.result.results ?? []) {
    if (result.success) continue;
    report.push({
      row: commit?.fileRows[result.row - 1] ?? result.row,
      email: result.email,
      status: result.status,
      codes: result.codes.join(", "),
      details: result.error ?? "",
    });
  }
  return report.sort((a, b) => a.row - b.row);
}

export async function downloadBulkOnboardErrorReport(report: BulkOnboardErrorReportRow[]): Promise<void> {
  await downloadXlsx("employee-onboard-errors.xlsx", [
    {
      name: "Errors",
      columns: [
        { header: "Row", key: "row", width: 8 },
        { header: "Email", key: "email", width: 30 },
        { header: "Status", key: "status", width: 14 },
        { header: "Codes", key: "codes", width: 30 },
        { header: "Details", key: "details", width: 80 },
      ],
      rows: report.map((row) => ({ ...row })),
    },
  ]);
}
