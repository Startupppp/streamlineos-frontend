/**
 * Reading a pasted or uploaded CSV, in the browser.
 *
 * Deliberately not a dependency. The rules that matter are the ones a naive
 * `split(",")` gets wrong — a quoted field containing a comma, a doubled quote
 * inside a quoted field, and a newline inside a quoted field — and all three are
 * a dozen lines of state machine. A library would be more surface for the same
 * behaviour, and the failure mode here is silent: a mis-parsed file imports
 * shifted columns without erroring.
 */

export interface ParsedCsv {
  readonly headers: string[];
  readonly rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  // Normalise line endings first: a file written on Windows would otherwise
  // leave a carriage return on the end of every last column.
  const input = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (quoted) {
      if (char === '"') {
        // A doubled quote inside a quoted field is one literal quote.
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

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Whatever is still in hand when the text ends is the final cell — a file
  // with no trailing newline is normal, not malformed.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // A trailing blank line is an artefact of how the file was written, not a
  // record. One entirely empty row at the end is dropped; blank rows in the
  // middle are kept, because the import reports them as skipped and the user
  // can see which line of their file it meant.
  while (rows.length > 0 && rows[rows.length - 1]!.every((value) => value.trim() === ""))
    rows.pop();

  const [headers = [], ...body] = rows;
  return { headers: headers.map((header) => header.trim()), rows: body };
}
