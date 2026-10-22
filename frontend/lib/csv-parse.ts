
export class CsvParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvParseError";
  }
}

export interface ParsedCsv {
  readonly headers: string[];
  readonly rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  const rowWasQuoted: boolean[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let rowQuoted = false;

  const input = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"' && cell === "") {
      quoted = true;
      rowQuoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      rowWasQuoted.push(rowQuoted);
      row = [];
      cell = "";
      rowQuoted = false;
    } else {
      cell += char;
    }
  }

  if (quoted) {
    throw new CsvParseError(
      'This file ends inside a quoted field, so a " somewhere is unclosed. Rows after it cannot be read.',
    );
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
    rowWasQuoted.push(rowQuoted);
  }

  while (
    rows.length > 0 &&
    !rowWasQuoted[rows.length - 1] &&
    rows[rows.length - 1].every((value) => value.trim() === "")
  ) {
    rows.pop();
    rowWasQuoted.pop();
  }

  const [headers = [], ...body] = rows;
  return { headers: headers.map((header) => header.trim()), rows: body };
}
