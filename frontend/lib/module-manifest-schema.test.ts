import {
  ModuleManifestError,
  parseModuleManifest,
  type ModuleEntry,
} from "./module-manifest-schema";

/**
 * `parseModuleManifest` replaced a Zod schema, so "it still validates" cannot
 * rest on the fact that the real manifest happens to parse — a function that
 * returned its argument unchecked would pass that test too. Every rule the Zod
 * object enforced gets one case here that BITES, and one that passes.
 */

const VALID_ENTRY: ModuleEntry = {
  administrable: true,
  administersNamespaces: ["hr"],
  cacheNamespaces: ["hr", "people"],
  displayName: "HR",
  id: "hr",
  ladder: "delegable",
  moduleFolder: "hr",
  planGated: true,
  productKey: "hrms",
  publicExposure: false,
  route: "/hr",
  schemaFolder: "hr",
};

function manifestWith(entry: Record<string, unknown>): unknown {
  return { modules: [{ ...VALID_ENTRY, ...entry }], version: 1 };
}

describe("parseModuleManifest accepts a well-formed manifest", () => {
  it("returns the parsed modules and version", () => {
    const parsed = parseModuleManifest({ modules: [VALID_ENTRY], version: 1 });
    expect(parsed.version).toBe(1);
    expect(parsed.modules).toEqual([VALID_ENTRY]);
  });

  it("drops an unknown key rather than rejecting it, as the non-strict object did", () => {
    const parsed = parseModuleManifest(
      manifestWith({ somethingAdditive: true }),
    );
    expect(parsed.modules[0]).toEqual(VALID_ENTRY);
  });

  it("accepts null for every nullable field", () => {
    const parsed = parseModuleManifest(
      manifestWith({
        moduleFolder: null,
        productKey: null,
        route: null,
        schemaFolder: null,
      }),
    );
    expect(parsed.modules[0]?.productKey).toBeNull();
  });
});

describe("parseModuleManifest rejects — one case per rule", () => {
  const cases: Array<[string, unknown, string]> = [
    ["a non-object root", 42, "(root)"],
    ["a missing modules array", { version: 1 }, "modules"],
    ["an empty modules array", { modules: [], version: 1 }, "modules"],
    ["a non-object module", { modules: [7], version: 1 }, "modules[0]"],
    ["a missing version", { modules: [VALID_ENTRY] }, "version"],
    ["a zero version", { modules: [VALID_ENTRY], version: 0 }, "version"],
    [
      "a fractional version",
      { modules: [VALID_ENTRY], version: 1.5 },
      "version",
    ],
    ["an empty id", manifestWith({ id: "" }), "modules[0].id"],
    ["a numeric id", manifestWith({ id: 3 }), "modules[0].id"],
    [
      "an unknown ladder",
      manifestWith({ ladder: "supervisor" }),
      "modules[0].ladder",
    ],
    [
      "a non-boolean administrable",
      manifestWith({ administrable: "yes" }),
      "modules[0].administrable",
    ],
    [
      "a non-boolean planGated",
      manifestWith({ planGated: 1 }),
      "modules[0].planGated",
    ],
    [
      "a non-boolean publicExposure",
      manifestWith({ publicExposure: null }),
      "modules[0].publicExposure",
    ],
    [
      "a non-string displayName",
      manifestWith({ displayName: null }),
      "modules[0].displayName",
    ],
    [
      "a non-array cacheNamespaces",
      manifestWith({ cacheNamespaces: "hr" }),
      "modules[0].cacheNamespaces",
    ],
    [
      "a non-string inside administersNamespaces",
      manifestWith({ administersNamespaces: ["hr", 2] }),
      "modules[0].administersNamespaces[1]",
    ],
    [
      "a numeric moduleFolder where null is allowed but a number is not",
      manifestWith({ moduleFolder: 9 }),
      "modules[0].moduleFolder",
    ],
    [
      "an undefined route — absent is not the same as null",
      manifestWith({ route: undefined }),
      "modules[0].route",
    ],
  ];

  it.each(cases)("rejects %s", (_label, input, path) => {
    expect(() => parseModuleManifest(input)).toThrow(ModuleManifestError);
    expect(() => parseModuleManifest(input)).toThrow(path);
  });
});
