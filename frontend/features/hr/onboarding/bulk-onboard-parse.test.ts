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
