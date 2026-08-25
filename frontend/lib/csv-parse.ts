/**
 * Reading a pasted or uploaded CSV, in the browser.
 *
 * Deliberately not a dependency. The rules that matter are the ones a naive
 * `split(",")` gets wrong — a quoted field containing a comma, a doubled quote
 * inside a quoted field, and a newline inside a quoted field — and all three are
 * a dozen lines of state machine. A library would be more surface for the same
 * behaviour, and the failure mode here is silent: a mis-parsed file imports
 * shifted columns without erroring.
 *
 * Which is why the two malformed-input paths below throw rather than guess. A
 * CSV that cannot be read correctly must not be read approximately.
 */

/** A file that cannot be parsed unambiguously. Carries text meant for a person. */
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
  /**
   * Whether each row held a quoted field, kept alongside the rows themselves.
   *
   * Only the trailing-blank trim reads it, and only to tell a blank line apart
   * from a row of deliberately empty quoted fields (`"",""`). Both arrive here
   * as empty strings, so without this the second is silently discarded — the
   * exact class of quiet loss this module exists to avoid.
   */
  const rowWasQuoted: boolean[] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let rowQuoted = false;

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

    /**
     * A quote opens a quoted field only at the start of one.
     *
     * Anywhere else it is data — an inch mark, a nickname, a stray character
     * from whatever exported the file — and treating it as an opening quote is
     * catastrophic rather than merely wrong: commas and newlines stop being
     * delimiters, so `Widget 24" Display` swallows every remaining row of the
     * file into a single cell and the import reports one record instead of five
     * hundred. `cell === ""` is exactly "nothing in this field yet", so
     * `a,"b,c"` still quotes and `24" Display` keeps its quote as a literal.
     */
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

  /**
   * Ending inside a quoted field means the file is malformed.
   *
   * Everything from the unclosed quote onward has been absorbed into one cell,
   * so any result returned here would be missing rows with no indication of it.
   */
  if (quoted) {
    throw new CsvParseError(
      'This file ends inside a quoted field, so a " somewhere is unclosed. Rows after it cannot be read.',
    );
  }

  // Whatever is still in hand when the text ends is the final cell — a file
  // with no trailing newline is normal, not malformed.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
    rowWasQuoted.push(rowQuoted);
  }

  // Trailing blank lines are an artefact of how the file was written, not
  // records — editors commonly leave more than one, so all of them go. Blank
  // rows in the middle are kept, because the import reports them as skipped and
  // the user can see which line of their file it meant. A trailing row that
  // quoted its emptiness is data and stays.
  while (
    rows.length > 0 &&
    !rowWasQuoted[rows.length - 1] &&
    rows[rows.length - 1]!.every((value) => value.trim() === "")
  ) {
    rows.pop();
    rowWasQuoted.pop();
  }

  const [headers = [], ...body] = rows;
  return { headers: headers.map((header) => header.trim()), rows: body };
}
