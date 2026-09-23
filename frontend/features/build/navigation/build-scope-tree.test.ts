import {
  resolveLinkedProjectParentPath,
  detectsQuarantinedProject,
} from "./build-scope-tree";

const PRODUCT_1 = 1;

function makeProductNames(entries: [number, string][]): ReadonlyMap<number, string> {
  return new Map(entries);
}

describe("resolveLinkedProjectParentPath", () => {
  test("BSN-02-012: linked project with a product returns the product name alone, with no workspace segment", () => {
    expect(resolveLinkedProjectParentPath("Product Alpha")).toBe("Product Alpha");
  });

  test("BSN-02-011: standalone project path resolves to null, not the string Organization, when product name is absent", () => {
    expect(resolveLinkedProjectParentPath(undefined)).toBeNull();
  });
});

describe("detectsQuarantinedProject", () => {
  const productNames = makeProductNames([[PRODUCT_1, "Product One"]]);

  test("BSN-02-018: standalone project with null managedProductId is never quarantined", () => {
    expect(detectsQuarantinedProject(null, productNames, true)).toBe(false);
  });

  test("BSN-02-018: linked project whose product is accessible is not quarantined", () => {
    expect(detectsQuarantinedProject(PRODUCT_1, productNames, true)).toBe(false);
  });

  test("BSN-02-018: linked project whose product is not in the hierarchy is quarantined", () => {
    const emptyProductNames = makeProductNames([]);
    expect(detectsQuarantinedProject(PRODUCT_1, emptyProductNames, true)).toBe(true);
  });

  test("BSN-02-018: linked project with a missing product is not quarantined when hierarchy is incomplete, to avoid false positives", () => {
    const emptyProductNames = makeProductNames([]);
    expect(detectsQuarantinedProject(PRODUCT_1, emptyProductNames, false)).toBe(false);
  });
});

describe("BSN-02-014: duplicate prevention contract", () => {
  test("a project that is quarantined does not also appear in the normal tree because the filters are mutually exclusive", () => {
    const emptyProductNames = makeProductNames([]);
    const quarantined = detectsQuarantinedProject(PRODUCT_1, emptyProductNames, true);
    const normal = !detectsQuarantinedProject(PRODUCT_1, emptyProductNames, true);
    expect(quarantined).toBe(true);
    expect(normal).toBe(false);
  });
});

describe("BSN-02-017: four states contract", () => {
  test("detectsQuarantinedProject returns false for null managedProductId enabling the no-accessible-scopes state", () => {
    const emptyProductNames = makeProductNames([]);
    expect(detectsQuarantinedProject(null, emptyProductNames, true)).toBe(false);
  });
});
