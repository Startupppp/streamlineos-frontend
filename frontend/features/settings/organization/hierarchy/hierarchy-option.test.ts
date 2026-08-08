import { isAssignableHierarchyParent } from "./hierarchy-option";

describe("isAssignableHierarchyParent", () => {
  it("allows only active, non-retired hierarchy units", () => {
    expect(
      isAssignableHierarchyParent({ status: "ACTIVE", deletedAt: null }),
    ).toBe(true);
    expect(
      isAssignableHierarchyParent({ status: "ARCHIVED", deletedAt: null }),
    ).toBe(false);
    expect(
      isAssignableHierarchyParent({ status: "DISABLED", deletedAt: null }),
    ).toBe(false);
    expect(
      isAssignableHierarchyParent({
        status: "ACTIVE",
        deletedAt: "2026-08-08T00:00:00.000Z",
      }),
    ).toBe(false);
  });
});
