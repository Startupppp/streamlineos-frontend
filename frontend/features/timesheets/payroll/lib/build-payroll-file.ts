import { downloadXlsx } from "@/lib/export/xlsx-utils";
import type {
  PayrollExportRow,
  PayrollMapping,
  ExportFormat,
  PayrollSummaryRow,
} from "../types";

export function summaryRowToExportRow(
  row: PayrollSummaryRow,
  periodStart: string,
  periodEnd: string,
): PayrollExportRow {
  return {
    userId: row.userId,
    employeeName: row.userName,
    employeeEmail: row.userEmail,
    periodStart,
    periodEnd,
    regularHours: row.regularHours,
    overtimeHours: row.overtimeHours,
    holidayHours: row.holidayHours,
    weekendHours: row.weekendHours,
    breakHours: row.breakHours,
    leaveDays: row.leaveDays,
    billableHours: row.billableHours,
    nonBillableHours: row.nonBillableHours,
    totalPayableHours: row.totalPayableHours,
    entryCount: row.entryCount,
  };
}

const COLUMN_VALUE_MAP: Record<string, (row: PayrollExportRow) => string | number> = {
  employeeName: (r) => r.employeeName,
  employeeEmail: (r) => r.employeeEmail,
  employeeId: (r) => r.userId,
  periodStart: (r) => r.periodStart,
  periodEnd: (r) => r.periodEnd,
  regularHours: (r) => r.regularHours,
  overtimeHours: (r) => r.overtimeHours,
  holidayHours: (r) => r.holidayHours,
  weekendHours: (r) => r.weekendHours,
  breakHours: (r) => r.breakHours,
  leaveDays: (r) => r.leaveDays,
  billableHours: (r) => r.billableHours,
  nonBillableHours: (r) => r.nonBillableHours,
  totalPayableHours: (r) => r.totalPayableHours,
  entryCount: (r) => r.entryCount,
};

export function applyMapping(
  rows: PayrollExportRow[],
  mapping: PayrollMapping,
): { headers: string[]; matrix: (string | number)[][] } {
  const enabledCols = mapping.columns.filter((c) => c.enabled);
  const headers = enabledCols.map((c) => c.header);
  const matrix = rows.map((row) =>
    enabledCols.map((col) => {
      const extractor = COLUMN_VALUE_MAP[col.key];
      return extractor ? extractor(row) : "";
    }),
  );
  return { headers, matrix };
}

function escapeCsvCell(value: string | number): string {
  let str = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], matrix: (string | number)[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const row of matrix) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}

function downloadCsvBlob(content: string, filename: string): void {
  const blob = new Blob([String.fromCharCode(0xfeff), content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadPayrollFile(
  format: ExportFormat,
  filename: string,
  headers: string[],
  matrix: (string | number)[][],
): Promise<void> {
  if (format === "CSV") {
    const csv = buildCsv(headers, matrix);
    downloadCsvBlob(csv, filename);
    return;
  }

  const rows = matrix.map((row) =>
    Object.fromEntries(row.map((value, i) => [`c${i}`, value])),
  );
  await downloadXlsx(filename, [
    {
      name: "Payroll",
      columns: headers.map((h, i) => ({ header: h, key: `c${i}`, width: 18 })),
      rows,
    },
  ]);
}
