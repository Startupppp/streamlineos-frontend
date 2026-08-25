import { CsvParseError, parseCsv } from "./csv-parse";

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

  /**
   * The two malformed-input paths. Both used to succeed and return a wrong
   * answer, which is the worst outcome available to a parser: an import that
   * reports "1 row" for a 500-row file and shows no error anywhere.
   */
  describe("a quote that is not opening a field", () => {
    it("treats an inch mark as data rather than swallowing the rest of the file", () => {
      const csv = 'product,company,amount\nWidget 24" Display,Acme,50000\nOther,Beta,900\n';
      expect(parseCsv(csv).rows).toEqual([
        ['Widget 24" Display', "Acme", "50000"],
        ["Other", "Beta", "900"],
      ]);
    });

    it("still quotes when the quote does open the field", () => {
      expect(parseCsv('name,city\n"Acme, Inc",London').rows).toEqual([["Acme, Inc", "London"]]);
    });

    it("keeps a trailing quote as data", () => {
      expect(parseCsv('size\n6 ft 2"').rows).toEqual([['6 ft 2"']]);
    });
  });

  describe("a quote that is never closed", () => {
    it("refuses the file instead of merging the rows after it", () => {
      expect(() => parseCsv('name,note\nAlice,"unclosed\nBob,ok\n')).toThrow(CsvParseError);
    });

    it("says what is wrong in words a person can act on", () => {
      expect(() => parseCsv('a\n"x')).toThrow(/unclosed/i);
    });
  });

  it("keeps a final row of deliberately empty quoted fields", () => {
    // Indistinguishable from a blank line without tracking that it was quoted,
    // and dropping it is silent data loss.
    expect(parseCsv('a,b\n1,2\n"",""\n').rows).toEqual([["1", "2"], ["", ""]]);
  });

  it("drops every trailing blank line, not just one", () => {
    expect(parseCsv("a,b\n1,2\n\n\n").rows).toEqual([["1", "2"]]);
  });
});
