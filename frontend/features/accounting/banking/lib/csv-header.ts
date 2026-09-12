export function sniffCsvColumns(
  content: string,
  delimiter: string,
  skipRows: number,
): string[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headerLine = lines[skipRows];
  if (!headerLine) return [];
  return headerLine
    .split(delimiter)
    .map((cell) => cell.trim().replace(/^"|"$/g, ""))
    .filter((cell) => cell.length > 0);
}
