import { resolveOrgUnitName } from "./resolve-org-unit-name";

describe("resolveOrgUnitName", () => {
  const names = new Map([["unit-1", "Engineering"]]);

  it("returns a display name for known organization units", () => {
    expect(resolveOrgUnitName(names, "unit-1", "Unknown unit")).toBe(
      "Engineering",
    );
  });

  it("never exposes an unresolved organization unit ID", () => {
    expect(resolveOrgUnitName(names, "private-id", "Unknown unit")).toBe(
      "Unknown unit",
    );
  });

  it("renders an empty value without an ID", () => {
    expect(resolveOrgUnitName(names, null, "Unknown unit")).toBe("—");
  });
});
