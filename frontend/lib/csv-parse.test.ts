import { parseCsv } from "./csv-parse";

describe("parseCsv", () => {
  it("reads a header row and the records under it", () => {
    expect(parseCsv("name,email\nAcme,ops@acme.example")).toEqual({
      headers: ["name", "email"],
      rows: [["Acme", "ops@acme.example"]],
    });
  });

  /**
   * The three a naive split gets wrong. Each one silently shifts every column
   * after it, so the file imports without erroring and lands in the wrong
   * fields.
   */
  it("keeps a comma inside a quoted field", () => {
    expect(parseCsv('name,city\n"Acme, Inc",London').rows).toEqual([["Acme, Inc", "London"]]);
  });

  it("reads a doubled quote as one literal quote", () => {
    expect(parseCsv('name\n"The ""Real"" Acme"').rows).toEqual([['The "Real" Acme']]);
  });

  it("keeps a newline inside a quoted field", () => {
    expect(parseCsv('notes\n"line one\nline two"').rows).toEqual([["line one\nline two"]]);
  });

  it("handles a file written on Windows", () => {
    // Otherwise every last column carries a trailing carriage return.
    expect(parseCsv("name,city\r\nAcme,London\r\n").rows).toEqual([["Acme", "London"]]);
  });

  it("reads a final cell with no trailing newline", () => {
    expect(parseCsv("name\nAcme").rows).toEqual([["Acme"]]);
  });

  it("drops a trailing blank line but keeps a blank row in the middle", () => {
    // The blank row is reported as skipped, naming the line of their file.
    const parsed = parseCsv("name\nAcme\n\nGlobex\n");
    expect(parsed.rows).toEqual([["Acme"], [""], ["Globex"]]);
  });

  it("trims header whitespace, because spreadsheets add it", () => {
    expect(parseCsv("  name  , email \nAcme,x").headers).toEqual(["name", "email"]);
  });

  it("returns nothing useful for empty input rather than throwing", () => {
    expect(parseCsv("")).toEqual({ headers: [], rows: [] });
  });

  it("keeps empty cells so column positions still line up", () => {
    expect(parseCsv("a,b,c\n1,,3").rows).toEqual([["1", "", "3"]]);
  });
});
