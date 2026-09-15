import { hasAssignedProductAccess } from "./product-access";

describe("product module assignment visibility", () => {
  it("keeps Home available to every organization member", () => {
    expect(hasAssignedProductAccess("home", {})).toBe(true);
  });

  it("does not treat member self-service grants as module assignments", () => {
    expect(
      hasAssignedProductAccess("hrms", {
        "hr:expenses:view": "all",
        "hr:leaves:create": "all",
      }),
    ).toBe(false);
    expect(
      hasAssignedProductAccess("timesheets", {
        "timesheets:entries:view": "own",
      }),
    ).toBe(false);
    expect(
      hasAssignedProductAccess("documents", {
        "kb:pages:view": "all",
      }),
    ).toBe(false);
  });

  it("shows a module when a module role grants a non-default permission", () => {
    expect(
      hasAssignedProductAccess("build", {
        "build:view": "all",
        "build:tickets:view": "all",
      }),
    ).toBe(true);
  });

  it("recognizes a module-owned secondary namespace", () => {
    expect(
      hasAssignedProductAccess("build", { "projects:members:view": "all" }),
    ).toBe(true);
  });
});
