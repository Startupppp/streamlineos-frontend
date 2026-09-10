import {
  MANIFEST,
  EXPECTED_MANIFEST_VERSION,
  moduleById,
  moduleByProductKey,
} from "./module-manifest";
import {
  ORG_MODULE_NAME,
  normalizeOrgModuleKey,
  orgModuleAliasesFor,
  matchesOrgModule,
} from "./org-module-keys";

describe("manifest shape", () => {
  it("validates and exposes all 23 registry modules", () => {
    expect(MANIFEST.modules.length).toBe(23);
  });

  it("exposes the expected version", () => {
    expect(MANIFEST.version).toBe(EXPECTED_MANIFEST_VERSION);
  });

  it("every module has a non-empty id", () => {
    const empty = MANIFEST.modules.filter((m) => m.id.trim().length === 0);
    expect(empty).toEqual([]);
  });

  it("module ids are unique", () => {
    const ids = MANIFEST.modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("modules are sorted by id", () => {
    const ids = MANIFEST.modules.map((m) => m.id);
    expect(ids).toEqual([...ids].sort());
  });
});

describe("moduleById lookup", () => {
  it("resolves a known id", () => {
    expect(moduleById("hr")?.displayName).toBe("HR");
  });

  it("returns undefined for an unknown id", () => {
    expect(moduleById("nonexistent")).toBeUndefined();
  });
});

describe("moduleByProductKey lookup", () => {
  it("resolves known product keys", () => {
    expect(moduleByProductKey("hrms")?.id).toBe("hr");
    expect(moduleByProductKey("finance")?.id).toBe("accounting");
    expect(moduleByProductKey("helpdesk")?.id).toBe("support");
    expect(moduleByProductKey("documents")?.id).toBe("kb");
    expect(moduleByProductKey("build")?.id).toBe("build");
    expect(moduleByProductKey("home")?.id).toBe("home");
  });

  it("returns undefined for an unknown product key", () => {
    expect(moduleByProductKey("projects")).toBeUndefined();
  });
});

describe("ORG_MODULE_NAME derivation", () => {
  it("covers all administrable modules with a productKey", () => {
    const administrableWithProduct = MANIFEST.modules.filter(
      (m) => m.administrable && m.productKey !== null,
    );
    for (const m of administrableWithProduct) {
      expect(ORG_MODULE_NAME[m.id]).toBe(m.id.toUpperCase());
    }
  });

  it("does not include modules without administrable+productKey", () => {
    expect(ORG_MODULE_NAME["billing"]).toBeUndefined();
    expect(ORG_MODULE_NAME["calendar"]).toBeUndefined();
  });
});

describe("normalizeOrgModuleKey — every key the implementation accepts", () => {
  const cases: Array<[string, string]> = [
    ["hr", "hr"],
    ["HR", "hr"],
    ["hrms", "hr"],
    ["HRMS", "hr"],
    ["crm", "crm"],
    ["CRM", "crm"],
    ["build", "build"],
    ["BUILD", "build"],
    ["projects", "build"],
    ["PROJECTS", "build"],
    ["accounting", "accounting"],
    ["ACCOUNTING", "accounting"],
    ["finance", "accounting"],
    ["FINANCE", "accounting"],
    ["inventory", "inventory"],
    ["INVENTORY", "inventory"],
    ["kb", "kb"],
    ["KB", "kb"],
    ["documents", "kb"],
    ["DOCUMENTS", "kb"],
    ["chat", "chat"],
    ["CHAT", "chat"],
    ["support", "support"],
    ["SUPPORT", "support"],
    ["helpdesk", "support"],
    ["HELPDESK", "support"],
    ["surveys", "surveys"],
    ["SURVEYS", "surveys"],
    ["payroll", "payroll"],
    ["PAYROLL", "payroll"],
    ["sign", "sign"],
    ["SIGN", "sign"],
    ["timesheets", "timesheets"],
    ["TIMESHEETS", "timesheets"],
    ["home", "home"],
    ["HOME", "home"],
  ];

  it.each(cases)("normalizeOrgModuleKey(%s) → %s", (input, expected) => {
    expect(normalizeOrgModuleKey(input)).toBe(expected);
  });
});

describe("orgModuleAliasesFor — preserves legacy stored-value compat", () => {
  it("returns the legacy-then-current pair for accounting", () => {
    expect(orgModuleAliasesFor("accounting")).toEqual(["FINANCE", "ACCOUNTING"]);
  });

  it("returns the legacy-then-current pair for finance", () => {
    expect(orgModuleAliasesFor("finance")).toEqual(["FINANCE", "ACCOUNTING"]);
  });

  it("returns the legacy-then-current pair for support", () => {
    expect(orgModuleAliasesFor("support")).toEqual(["HELPDESK", "SUPPORT"]);
  });

  it("returns the legacy-then-current pair for helpdesk", () => {
    expect(orgModuleAliasesFor("helpdesk")).toEqual(["HELPDESK", "SUPPORT"]);
  });

  it("returns just the current stored value for hr (never had a legacy stored value)", () => {
    expect(orgModuleAliasesFor("hr")).toEqual(["HR"]);
  });

  it("returns both build aliases to cover pre- and post-rename stored values", () => {
    expect(orgModuleAliasesFor("build")).toEqual(["BUILD", "PROJECTS"]);
    expect(orgModuleAliasesFor("PROJECTS")).toEqual(["BUILD", "PROJECTS"]);
  });

  it("falls back to uppercased input for modules without an alias", () => {
    expect(orgModuleAliasesFor("chat")).toEqual(["CHAT"]);
  });
});

describe("matchesOrgModule — all accepted stored spellings", () => {
  it("matches build against both pre- and post-rename stored values", () => {
    expect(matchesOrgModule(["PROJECTS"], "build")).toBe(true);
    expect(matchesOrgModule(["BUILD"], "build")).toBe(true);
    expect(matchesOrgModule(["BUILD"], "PROJECTS")).toBe(true);
  });

  it("matches accounting against FINANCE (legacy) and ACCOUNTING (current)", () => {
    expect(matchesOrgModule(["FINANCE"], "accounting")).toBe(true);
    expect(matchesOrgModule(["ACCOUNTING"], "accounting")).toBe(true);
    expect(matchesOrgModule(["FINANCE"], "finance")).toBe(true);
  });

  it("matches support against HELPDESK (legacy) and SUPPORT (current)", () => {
    expect(matchesOrgModule(["HELPDESK"], "support")).toBe(true);
    expect(matchesOrgModule(["SUPPORT"], "support")).toBe(true);
  });

  it("matches hr against HR", () => {
    expect(matchesOrgModule(["HR"], "hr")).toBe(true);
  });

  it("matches kb against KB", () => {
    expect(matchesOrgModule(["KB"], "kb")).toBe(true);
  });

  it("does not widen across modules", () => {
    expect(matchesOrgModule(["HELPDESK", "FINANCE"], "build")).toBe(false);
    expect(matchesOrgModule(["HR"], "crm")).toBe(false);
  });

  it("is case-insensitive on both sides", () => {
    expect(matchesOrgModule(["hr"], "HR")).toBe(true);
    expect(matchesOrgModule(["projects"], "Build")).toBe(true);
  });
});
