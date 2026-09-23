import {
  IGNORED_SOURCE_COLUMNS,
  IMPORTABLE_FIELDS,
  mapSourceColumns,
  readSourceColumns,
  unmappedColumns,
} from "./import-column-mapping";

describe("readSourceColumns", () => {
  it("reads the CSV header row, because the mapping a user sees must come from their file", () => {
    expect(readSourceColumns("csv", "title,status,points\nShip it,TODO,3")).toEqual([
      "title",
      "status",
      "points",
    ]);
  });

  it("keeps a quoted header containing a comma as one column", () => {
    expect(readSourceColumns("csv", '"title, short",status\nx,y')).toEqual([
      "title, short",
      "status",
    ]);
  });

  it("unescapes a doubled quote inside a quoted header", () => {
    expect(readSourceColumns("csv", '"the ""title""",status\nx,y')).toEqual([
      'the "title"',
      "status",
    ]);
  });

  it("skips leading blank lines rather than reporting an empty header", () => {
    expect(readSourceColumns("csv", "\n\ntitle,status\nx,y")).toEqual(["title", "status"]);
  });

  it("returns nothing for an empty CSV instead of one empty column name", () => {
    expect(readSourceColumns("csv", "   ")).toEqual([]);
  });

  it("unions the keys of every JSON row, so a column present on only one row is still shown", () => {
    const content = JSON.stringify([{ title: "a" }, { title: "b", priority: "HIGH" }]);
    expect(readSourceColumns("json", content)).toEqual(["title", "priority"]);
  });

  it("returns nothing for JSON that is not an array of objects", () => {
    expect(readSourceColumns("json", '{"title":"a"}')).toEqual([]);
    expect(readSourceColumns("json", "not json")).toEqual([]);
  });
});

describe("mapSourceColumns", () => {
  it("marks a column the importer writes as MAPPED onto its ticket field", () => {
    expect(mapSourceColumns("csv", "title,status\nx,y")).toEqual([
      { column: "title", field: "title", state: "MAPPED" },
      { column: "status", field: "status", state: "MAPPED" },
    ]);
  });

  it("matches a header case-insensitively, because a spreadsheet export capitalises headers", () => {
    expect(mapSourceColumns("csv", "Title,DueDate\nx,y")).toEqual([
      { column: "Title", field: "title", state: "MAPPED" },
      { column: "DueDate", field: "dueDate", state: "MAPPED" },
    ]);
  });

  it("marks a column the importer drops as IGNORED, not as an error the user must fix", () => {
    expect(mapSourceColumns("csv", "ticketNumber,title\n1,x")).toEqual([
      { column: "ticketNumber", field: null, state: "IGNORED" },
      { column: "title", field: "title", state: "MAPPED" },
    ]);
  });

  it("marks a column the importer rejects as UNKNOWN, which is what fails the row", () => {
    expect(mapSourceColumns("csv", "assigneeMembershipId,title\n9,x")).toEqual([
      { column: "assigneeMembershipId", field: null, state: "UNKNOWN" },
      { column: "title", field: "title", state: "MAPPED" },
    ]);
  });

  it("collects only the rejected columns in unmappedColumns, never the ignored ones", () => {
    const mappings = mapSourceColumns("csv", "ticketNumber,assigneeMembershipId,title\n1,9,x");
    expect(unmappedColumns(mappings).map((entry) => entry.column)).toEqual([
      "assigneeMembershipId",
    ]);
  });
});

describe("the importable field list is derived from the response contract, not retyped", () => {
  it("names title and status, the two fields every preview row carries", () => {
    expect(IMPORTABLE_FIELDS).toContain("title");
    expect(IMPORTABLE_FIELDS).toContain("status");
  });

  it("does not offer a field the backend refuses, which would advertise a mapping that fails", () => {
    expect(IMPORTABLE_FIELDS).not.toContain("assigneeMembershipId");
    expect(IMPORTABLE_FIELDS).not.toContain("ticketNumber");
  });

  it("pins the ignored column set the backend strips in import-source.ts", () => {
    expect([...IGNORED_SOURCE_COLUMNS]).toEqual([
      "id",
      "ticketNumber",
      "ticketKey",
      "projectId",
      "orgId",
      "createdAt",
      "updatedAt",
    ]);
  });
});
