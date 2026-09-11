import {
  compareAdministersNamespaces,
  parseRegistryModules,
} from "./check-module-manifest.mjs";

describe("parseRegistryModules — administersNamespaces extraction", () => {
  it("reads the shared NONE constant as an empty array", () => {
    const registry = `
      export const MODULE_REGISTRY = [
        {
          id: "build",
          administersNamespaces: NONE,
        },
      ] as const satisfies readonly [];
    `;
    expect(parseRegistryModules(registry)).toEqual([
      { id: "build", administersNamespaces: [] },
    ]);
  });

  it("reads a multi-entry inline array literal", () => {
    const registry = `
      export const MODULE_REGISTRY = [
        {
          id: "home",
          administersNamespaces: ["chat", "mail", "calendar", "notifications"],
        },
      ] as const satisfies readonly [];
    `;
    expect(parseRegistryModules(registry)).toEqual([
      {
        id: "home",
        administersNamespaces: ["chat", "mail", "calendar", "notifications"],
      },
    ]);
  });

  it("reads a single-entry array literal", () => {
    const registry = `
      export const MODULE_REGISTRY = [
        {
          id: "crm",
          administersNamespaces: ["party"],
        },
      ] as const satisfies readonly [];
    `;
    expect(parseRegistryModules(registry)).toEqual([
      { id: "crm", administersNamespaces: ["party"] },
    ]);
  });
});

describe("compareAdministersNamespaces — the drift bite", () => {
  it("passes when both sides agree, order-insensitive", () => {
    const registryModules = [
      { id: "home", administersNamespaces: ["chat", "mail", "calendar", "notifications"] },
      { id: "crm", administersNamespaces: ["party"] },
    ];
    const manifestModules = [
      { id: "home", administersNamespaces: ["notifications", "calendar", "mail", "chat"] },
      { id: "crm", administersNamespaces: ["party"] },
    ];
    expect(compareAdministersNamespaces(registryModules, manifestModules)).toEqual([]);
  });

  it("fails and names the module id and both sides' values on a mismatch", () => {
    const registryModules = [
      { id: "home", administersNamespaces: ["chat", "mail", "calendar", "notifications"] },
    ];
    const manifestModules = [{ id: "home", administersNamespaces: ["chat", "mail"] }];
    const violations = compareAdministersNamespaces(registryModules, manifestModules);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("home");
    expect(violations[0]).toContain("calendar");
    expect(violations[0]).toContain("notifications");
    expect(violations[0]).toContain("regenerate frontend/lib/module-manifest.json");
    expect(violations[0]).toContain("backend/src/scripts/export-module-manifest.ts");
  });

  it("fails when the registry declares a module the manifest does not have", () => {
    const registryModules = [{ id: "surveys", administersNamespaces: [] }];
    const manifestModules: Array<{ id: string; administersNamespaces: string[] }> = [];
    const violations = compareAdministersNamespaces(registryModules, manifestModules);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("surveys");
  });

  it("fails when the manifest declares a module the registry does not have", () => {
    const registryModules: Array<{ id: string; administersNamespaces: string[] }> = [];
    const manifestModules = [{ id: "surveys", administersNamespaces: [] }];
    const violations = compareAdministersNamespaces(registryModules, manifestModules);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("surveys");
  });

  it("fails when the registry side could not be parsed", () => {
    const registryModules = [{ id: "hr", administersNamespaces: undefined }];
    const manifestModules = [{ id: "hr", administersNamespaces: [] }];
    const violations = compareAdministersNamespaces(registryModules, manifestModules);
    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("Could not parse");
  });
});
