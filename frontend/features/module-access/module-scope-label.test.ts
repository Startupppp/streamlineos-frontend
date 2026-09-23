import { moduleScopeExplanation, moduleScopeLabel } from "./module-scope-label";

describe("moduleScopeLabel", () => {
  it("keeps acronyms upper-case so the badge reads 'HR permissions', not 'Hr permissions'", () => {
    expect(moduleScopeLabel("hr")).toBe("HR");
    expect(moduleScopeLabel("crm")).toBe("CRM");
  });

  it("accepts the key in any case, because callers pass it straight from the route", () => {
    expect(moduleScopeLabel("HR")).toBe("HR");
  });

  it("title-cases an unknown module instead of rendering a raw key", () => {
    expect(moduleScopeLabel("warehouse")).toBe("Warehouse");
  });
});

describe("moduleScopeExplanation", () => {
  it("says outright that the module total is not meant to match Settings, which is the count mismatch users report", () => {
    const text = moduleScopeExplanation("hr");
    expect(text).toContain("HR module only");
    expect(text).toContain("not meant to match");
  });

  it("names where the organisation-wide list lives so the reader can compare like for like", () => {
    expect(moduleScopeExplanation("hr")).toContain("Settings → Roles");
  });
});
