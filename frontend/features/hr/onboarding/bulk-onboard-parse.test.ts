import { CONFLICT_KEY, LEGACY_PRIMARY_KEY, SOURCE_ROW_KEY } from "./bulk-onboard-columns";
import { missingRequiredHeaders, parseFile, ParseStructuralError } from "./bulk-onboard-parse";

function csvFile(text: string): File {
  const file = new File([text], "employees.csv", { type: "text/csv" });
  // jsdom's File predates Blob.text(); the parser only needs the text.
  Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
  return file;
}

describe("parseFile (CSV)", () => {
  it("maps the header aliases people type onto canonical keys and drops unknown columns", async () => {
    const rows = await parseFile(
      csvFile("First Name,E-mail,Reports To,Shoe size\nPriya,priya@example.com,boss@example.com,9\n"),
    );

    expect(rows).toEqual([
      { firstName: "Priya", email: "priya@example.com", primaryManagerEmail: "boss@example.com", [LEGACY_PRIMARY_KEY]: "Reports To", [SOURCE_ROW_KEY]: "1" },
    ]);
  });

  it("keeps a filled manager column when a legacy duplicate header is blank, and reports no legacy use", async () => {
    const rows = await parseFile(csvFile("email,primaryManagerEmail,reportsTo\na@example.com,boss@example.com,\n"));
    expect(rows).toEqual([{ email: "a@example.com", primaryManagerEmail: "boss@example.com", [SOURCE_ROW_KEY]: "1" }]);
  });

  it("flags two headers that give the primary manager different values", async () => {
    const rows = await parseFile(csvFile("email,primaryManagerEmail,reportingManagerEmail\na@example.com,one@example.com,two@example.com\n"));
    expect(rows[0]).toMatchObject({ [CONFLICT_KEY]: "primaryManagerEmail" });
  });

  it("does not flag the same value under both headers", async () => {
    const rows = await parseFile(csvFile("email,primaryManagerEmail,managerEmail\na@example.com,Boss@example.com,boss@example.com\n"));
    expect(rows[0]).not.toHaveProperty(CONFLICT_KEY);
  });

  it("skips blank lines but keeps every row's own number in the file", async () => {
    const rows = await parseFile(csvFile("email\n\na@example.com\n  \nb@example.com\n\n"));
    expect(rows).toEqual([
      { email: "a@example.com", [SOURCE_ROW_KEY]: "2" },
      { email: "b@example.com", [SOURCE_ROW_KEY]: "4" },
    ]);
  });

  it("rejects the whole file with a line number when an unclosed quote is present", async () => {
    const csv = `firstName,lastName,email,designation,department,joiningDate,phone
Alice,Smith,alice@example.com,Engineer,Engineering,2026-01-15,+911234567890
"Unclosed,Row,bad@example.com,QA,Engineering,2026-01-15,+911234567890
Bob,Jones,bob@example.com,Designer,Design,2026-01-15,+911234567890
`;
    await expect(parseFile(csvFile(csv))).rejects.toBeInstanceOf(ParseStructuralError);
    await expect(parseFile(csvFile(csv))).rejects.toMatchObject({ message: expect.stringMatching(/^Line \d+: unclosed quote$/) });
  });

  it("maps line number accounting for the header when reporting unclosed quote", async () => {
    const csv = `firstName,lastName,email,designation,department,joiningDate,phone
"Unclosed,Row,bad@example.com,QA,Engineering,2026-01-15,+911234567890
`;
    let err: unknown;
    try {
      await parseFile(csvFile(csv));
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(ParseStructuralError);
    expect((err as ParseStructuralError).message).toBe("Line 2: unclosed quote");
  });
});

describe("parseFile (xlsx)", () => {
  it("reads rich text, dates and formula results from the Employees sheet", async () => {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Employees");
    sheet.addRow(["firstName", "joiningDate", "monthlySalary", "Manager Email"]);
    const row = sheet.addRow([]);
    row.getCell(1).value = { richText: [{ text: "Pri" }, { text: "ya" }] };
    row.getCell(2).value = new Date(2026, 3, 1);
    row.getCell(3).value = { formula: "70000+5000", result: 75000 };
    row.getCell(4).value = "boss@example.com";
    const buffer = await workbook.xlsx.writeBuffer();

    const file = new File([], "employees.xlsx");
    Object.defineProperty(file, "arrayBuffer", { value: () => Promise.resolve(buffer) });

    expect(await parseFile(file)).toEqual([
      { firstName: "Priya", joiningDate: "2026-04-01", monthlySalary: "75000", primaryManagerEmail: "boss@example.com", [LEGACY_PRIMARY_KEY]: "Manager Email", [SOURCE_ROW_KEY]: "1" },
    ]);
  });
});

describe("missingRequiredHeaders", () => {
  it("names every required template column a wrong-template file lacks", async () => {
    const rows = await parseFile(csvFile("Name,Mail\nAnn One,ann@example.com\nBob Two,bob@example.com\n"));
    expect(missingRequiredHeaders(rows)).toEqual(["firstName", "lastName", "email", "designation", "department"]);
  });

  it("finds nothing missing when the template header row is kept, even with blank cells", async () => {
    const rows = await parseFile(csvFile("firstName,lastName,email,designation,department\nAnn,,ann@example.com,,\n"));
    expect(missingRequiredHeaders(rows)).toEqual([]);
  });
});
