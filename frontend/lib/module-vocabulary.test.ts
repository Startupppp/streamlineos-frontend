import { matchesOrgModule, orgModuleAliasesFor } from "./module-vocabulary";

describe("orgModuleAliasesFor", () => {
  it("treats build and the legacy projects spelling as the same module", () => {
    expect(orgModuleAliasesFor("build")).toEqual(["BUILD", "PROJECTS"]);
    expect(orgModuleAliasesFor("PROJECTS")).toEqual(["BUILD", "PROJECTS"]);
  });

  it("maps a catalog key to its stored projection name", () => {
    expect(orgModuleAliasesFor("accounting")).toEqual(["FINANCE", "ACCOUNTING"]);
    expect(orgModuleAliasesFor("support")).toEqual(["HELPDESK", "SUPPORT"]);
    expect(orgModuleAliasesFor("hr")).toEqual(["HR"]);
  });

  it("falls back to the uppercased input for unknown modules", () => {
    expect(orgModuleAliasesFor("chat")).toEqual(["CHAT"]);
  });
});

describe("matchesOrgModule", () => {
  it("matches the build module before the data migration renames PROJECTS", () => {
    expect(matchesOrgModule(["HR", "PROJECTS"], "build")).toBe(true);
  });

  it("matches the build module after the data migration renames it to BUILD", () => {
    expect(matchesOrgModule(["HR", "BUILD"], "build")).toBe(true);
  });

  it("matches legacy PROJECTS call sites against a migrated BUILD org", () => {
    expect(matchesOrgModule(["BUILD"], "PROJECTS")).toBe(true);
  });

  it("matches the stored projection for accounting and support", () => {
    expect(matchesOrgModule(["FINANCE"], "accounting")).toBe(true);
    expect(matchesOrgModule(["HELPDESK"], "support")).toBe(true);
  });

  it("keeps kb resolvable so core-module surfaces stay visible", () => {
    expect(matchesOrgModule(["KB"], "kb")).toBe(true);
  });

  it("does not widen across modules", () => {
    expect(matchesOrgModule(["HELPDESK", "FINANCE"], "build")).toBe(false);
    expect(matchesOrgModule(["HR"], "crm")).toBe(false);
  });

  it("is case insensitive on both sides", () => {
    expect(matchesOrgModule(["hr"], "HR")).toBe(true);
    expect(matchesOrgModule(["projects"], "Build")).toBe(true);
  });
});
