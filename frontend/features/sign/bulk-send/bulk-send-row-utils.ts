import type { SignBulkSendRow } from "@/types/sign";

/**
 * `columnMappingJson` maps a logical field onto the CSV header the operator
 * chose, so the raw row is only readable through it.
 */
export function rowIdentity(
  row: SignBulkSendRow,
  mapping: Record<string, string>,
): { name: string; email: string } {
  return { name: mappedValue(row, mapping, "name"), email: mappedValue(row, mapping, "email") };
}

function mappedValue(row: SignBulkSendRow, mapping: Record<string, string>, field: string): string {
  const column = mapping[field];
  if (!column) return "";
  const value = row.rawDataJson[column];
  return value == null ? "" : String(value);
}

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function failedRowsCsv(rows: SignBulkSendRow[], mapping: Record<string, string>): string {
  const header = ["Row", "Name", "Email", "Error"].join(",");
  const body = rows.map((row) => {
    const identity = rowIdentity(row, mapping);
    return [row.rowNumber, identity.name, identity.email, row.errorMessage ?? ""].map(csvCell).join(",");
  });
  return [header, ...body].join("\n");
}
