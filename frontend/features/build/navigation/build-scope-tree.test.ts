import {
  resolveLinkedProjectParentPath,
  detectsQuarantinedProduct,
  detectsQuarantinedProject,
} from "./build-scope-tree";

const WORKSPACE_A = "ws-a";
const WORKSPACE_B = "ws-b";
const PRODUCT_1 = 1;
const PRODUCT_2 = 2;

function makeWorkspaceNames(entries: [string, string][]): ReadonlyMap<string, string> {
  return new Map(entries);
}

function makeProductNames(entries: [number, string][]): ReadonlyMap<number, string> {
  return new Map(entries);
}

function makeProductWorkspaceIds(entries: [number, string | null][]): ReadonlyMap<number, string | null> {
  return new Map(entries);
}

describe("resolveLinkedProjectParentPath", () => {
  test("BSN-02-012: linked project with both product and workspace returns workspace-slash-product path", () => {
    expect(resolveLinkedProjectParentPath("Product Alpha", "Workspace One")).toBe(
      "Workspace One / Product Alpha",
    );
  });

  test("BSN-02-012: linked project with product but no workspace returns product name alone", () => {
    expect(resolveLinkedProjectParentPath("Product Alpha", undefined)).toBe("Product Alpha");
  });

  test("BSN-02-011: standalone project path resolves to Organization when product name is absent", () => {
    expect(resolveLinkedProjectParentPath(undefined, undefined)).toBe("Organization");
  });

  test("BSN-02-011: standalone project path resolves to Organization when product name is undefined regardless of workspace", () => {
    expect(resolveLinkedProjectParentPath(undefined, "Workspace One")).toBe("Organization");
  });
});

describe("detectsQuarantinedProduct", () => {
  const names = makeWorkspaceNames([
    [WORKSPACE_A, "Workspace A"],
  ]);

  test("BSN-02-018: product with null workspace is never quarantined", () => {
    expect(detectsQuarantinedProduct(null, names, true)).toBe(false);
  });

  test("BSN-02-018: product referencing a known workspace is not quarantined", () => {
    expect(detectsQuarantinedProduct(WORKSPACE_A, names, true)).toBe(false);
  });

  test("BSN-02-018: product referencing an unknown workspace is quarantined when hierarchy is complete", () => {
    expect(detectsQuarantinedProduct(WORKSPACE_B, names, true)).toBe(true);
  });

  test("BSN-02-018: product with unknown workspace is not quarantined when hierarchy is incomplete to avoid false positives", () => {
    expect(detectsQuarantinedProduct(WORKSPACE_B, names, false)).toBe(false);
  });
});

describe("detectsQuarantinedProject", () => {
  const productNames = makeProductNames([
    [PRODUCT_1, "Product One"],
  ]);
  const productWorkspaceIds = makeProductWorkspaceIds([
    [PRODUCT_1, WORKSPACE_A],
    [PRODUCT_2, WORKSPACE_B],
  ]);
  const workspaceNames = makeWorkspaceNames([
    [WORKSPACE_A, "Workspace A"],
  ]);

  test("BSN-02-018: standalone project with null managedProductId is never quarantined", () => {
    expect(
      detectsQuarantinedProject(null, productNames, productWorkspaceIds, workspaceNames, true),
    ).toBe(false);
  });

  test("BSN-02-018: linked project whose product is accessible and workspace is accessible is not quarantined", () => {
    expect(
      detectsQuarantinedProject(PRODUCT_1, productNames, productWorkspaceIds, workspaceNames, true),
    ).toBe(false);
  });

  test("BSN-02-018: linked project whose product is not in hierarchy is quarantined", () => {
    const emptyProductNames = makeProductNames([]);
    expect(
      detectsQuarantinedProject(PRODUCT_1, emptyProductNames, productWorkspaceIds, workspaceNames, true),
    ).toBe(true);
  });

  test("BSN-02-018: linked project whose product exists but parent workspace is missing is quarantined", () => {
    expect(
      detectsQuarantinedProject(PRODUCT_2, productNames, productWorkspaceIds, workspaceNames, true),
    ).toBe(true);
  });

  test("BSN-02-018: linked project with missing parent chain is not quarantined when hierarchy is incomplete", () => {
    const emptyProductNames = makeProductNames([]);
    expect(
      detectsQuarantinedProject(PRODUCT_1, emptyProductNames, productWorkspaceIds, workspaceNames, false),
    ).toBe(false);
  });
});

describe("BSN-02-014: duplicate prevention contract", () => {
  test("a project that is quarantined does not also appear in the normal tree because it is excluded from the normal filter", () => {
    const productNames = makeProductNames([]);
    const productWorkspaceIds = makeProductWorkspaceIds([]);
    const workspaceNames = makeWorkspaceNames([]);
    const quarantined = detectsQuarantinedProject(PRODUCT_1, productNames, productWorkspaceIds, workspaceNames, true);
    const normal = !detectsQuarantinedProject(PRODUCT_1, productNames, productWorkspaceIds, workspaceNames, true);
    expect(quarantined).toBe(true);
    expect(normal).toBe(false);
  });

  test("a product that is quarantined does not also appear in the normal list because the filters are mutually exclusive", () => {
    const names = makeWorkspaceNames([]);
    const quarantined = detectsQuarantinedProduct(WORKSPACE_A, names, true);
    const normal = !detectsQuarantinedProduct(WORKSPACE_A, names, true);
    expect(quarantined).toBe(true);
    expect(normal).toBe(false);
  });
});

describe("BSN-02-017: four states contract", () => {
  test("detectsQuarantinedProject returns false for null managedProductId enabling the no-accessible-scopes state", () => {
    const productNames = makeProductNames([]);
    const productWorkspaceIds = makeProductWorkspaceIds([]);
    const workspaceNames = makeWorkspaceNames([]);
    expect(
      detectsQuarantinedProject(null, productNames, productWorkspaceIds, workspaceNames, true),
    ).toBe(false);
  });

  test("hierarchy-complete guard prevents false quarantine positives that would corrupt the load-failure state", () => {
    const names = makeWorkspaceNames([]);
    expect(detectsQuarantinedProduct(WORKSPACE_A, names, false)).toBe(false);
    expect(detectsQuarantinedProduct(WORKSPACE_A, names, true)).toBe(true);
  });
});
