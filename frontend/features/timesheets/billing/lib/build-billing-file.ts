import { downloadXlsx } from "@/lib/export/xlsx-utils";
import type { BillingGroup } from "@/features/timesheets/types";

function escapeCsvCell(value: string | number): string {
  let str = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(headers: string[], matrix: (string | number)[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const row of matrix) lines.push(row.map(escapeCsvCell).join(","));
  return lines.join("\r\n");
}

function downloadCsvBlob(content: string, filename: string): void {
  const blob = new Blob([String.fromCharCode(0xfeff), content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildBillingMatrix(groups: BillingGroup[]): {
  headers: string[];
  matrix: (string | number)[][];
} {
  const headers = ["Project", "Hours", "Bill Rate", "Amount", "Currency", "Entries"];
  const matrix = groups.map((g) => [
    g.projectName,
    Number(g.totalHours.toFixed(2)),
    g.totalHours > 0 && g.billableAmount > 0
      ? Number((g.billableAmount / g.totalHours).toFixed(2))
      : "—",
    Number(g.billableAmount.toFixed(2)),
    g.currency,
    g.entryCount,
  ]);
  return { headers, matrix };
}

export function buildBillingCsv(groups: BillingGroup[]): string {
  const { headers, matrix } = buildBillingMatrix(groups);
  return buildCsv(headers, matrix);
}

export function downloadBillingCsv(groups: BillingGroup[], filename: string): void {
  const csv = buildBillingCsv(groups);
  downloadCsvBlob(csv, filename);
}

export async function downloadBillingFile(
  format: "CSV" | "XLSX",
  filename: string,
  groups: BillingGroup[],
): Promise<void> {
  if (format === "CSV") {
    downloadBillingCsv(groups, filename);
    return;
  }
  const { headers, matrix } = buildBillingMatrix(groups);
  const rows = matrix.map((row) =>
    Object.fromEntries(row.map((value, i) => [`c${i}`, value])),
  );
  await downloadXlsx(filename, [
    {
      name: "Billing",
      columns: headers.map((h, i) => ({ header: h, key: `c${i}`, width: 18 })),
      rows,
    },
  ]);
}
