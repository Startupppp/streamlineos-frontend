import { parseFile } from "./bulk-onboard-parse";

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
      { firstName: "Priya", email: "priya@example.com", reportingManagerEmail: "boss@example.com" },
    ]);
  });

  it("skips blank lines", async () => {
    const rows = await parseFile(csvFile("email\n\na@example.com\n\n"));
    expect(rows).toEqual([{ email: "a@example.com" }]);
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
      { firstName: "Priya", joiningDate: "2026-04-01", monthlySalary: "75000", reportingManagerEmail: "boss@example.com" },
    ]);
  });
});
