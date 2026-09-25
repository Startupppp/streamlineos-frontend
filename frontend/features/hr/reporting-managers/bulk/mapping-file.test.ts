import { mapMappingRows, normalizeMappingHeader, parseMappingFile } from "./mapping-file";

describe("bulk reporting-change mapping file", () => {
  it("matches headers ignoring case, spaces, _ and -, and reads legacy manager headers as primary", () => {
    expect(normalizeMappingHeader("Employee Email")).toBe("employeeEmail");
    expect(normalizeMappingHeader("primary_manager-email")).toBe("primaryManagerEmail");
    expect(normalizeMappingHeader("reportingManagerEmail")).toBe("primaryManagerEmail");
    expect(normalizeMappingHeader("Reports To")).toBe("primaryManagerEmail");
    expect(normalizeMappingHeader("manager email")).toBe("primaryManagerEmail");
    expect(normalizeMappingHeader("Secondary Manager Email 2")).toBe("secondaryManagerEmail2");
    expect(normalizeMappingHeader("shoe size")).toBeNull();
  });

  it("lower-cases emails, keeps reasons as typed, omits blanks and skips empty lines", () => {
    const result = mapMappingRows([
      { "Employee Email": " Priya@Example.com ", "Reports To": "Boss@Example.com", reason: "Team Move", effectiveFrom: "" },
      { "Employee Email": "", "Reports To": "" },
      { employeeEmail: "sam@example.com" },
    ]);
    expect(result).toEqual({
      errors: [],
      rows: [
        { employeeEmail: "priya@example.com", primaryManagerEmail: "boss@example.com", reason: "Team Move" },
        { employeeEmail: "sam@example.com" },
      ],
    });
  });

  it("reports a filled row without an employee email by its sheet row", () => {
    const result = mapMappingRows([{ employeeEmail: "a@example.com" }, { primaryManagerEmail: "boss@example.com" }]);
    expect(result.errors).toEqual(["Row 3: employeeEmail is required"]);
  });

  it("refuses more rows than one job accepts", () => {
    const raw = Array.from({ length: 501 }, (_, index) => ({ employeeEmail: `e${index}@example.com` }));
    expect(mapMappingRows(raw).errors).toEqual(["A file may change at most 500 employees; this one has 501."]);
  });

  it("parses a CSV file", async () => {
    const text = "employeeEmail,managerEmail\na@example.com,b@example.com\n\n";
    const file = new File([text], "map.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: () => Promise.resolve(text) });
    await expect(parseMappingFile(file)).resolves.toEqual({
      errors: [],
      rows: [{ employeeEmail: "a@example.com", primaryManagerEmail: "b@example.com" }],
    });
  });
});
