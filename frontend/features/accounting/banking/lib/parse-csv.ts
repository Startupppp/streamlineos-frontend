export interface ParsedCsv {
  headers: string[];
  rows: string[][];
  rowCount: number;
}

export const DATE_FORMAT_OPTIONS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
  { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
];

function looksLikeHeader(row: string[]): boolean {
  return row.some((cell) => /[a-zA-Z]/.test(cell));
}

function normalizeRow(row: unknown[]): string[] {
  return row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)));
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  const { default: Papa } = await import("papaparse");
  return new Promise((resolve, reject) => {
    Papa.parse<unknown[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const rawRows = result.data.map(normalizeRow);

        if (rawRows.length === 0) {
          resolve({ headers: [], rows: [], rowCount: 0 });
          return;
        }

        const firstRow = rawRows[0] ?? [];
        const hasHeader = looksLikeHeader(firstRow);
        const headers = hasHeader ? firstRow : firstRow.map((_, i) => `Column ${i + 1}`);
        const dataRows = hasHeader ? rawRows.slice(1) : rawRows;

        resolve({ headers, rows: dataRows, rowCount: dataRows.length });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}
