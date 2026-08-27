import {
  flattenNavRoutes,
  getNavGroupsForUser,
  getNavGroupsForProduct,
  type NavGroup,
} from "./sidebar/sidebar-nav-items";

function hrefsFrom(groups: NavGroup[]): string[] {
  return flattenNavRoutes(groups.flatMap((g) => g.routes)).map((r) => r.href);
}

function scopesOf(keys: readonly string[]): Record<string, "all"> {
  return Object.fromEntries(keys.map((k) => [k, "all" as const]));
}

describe("all three navigation surfaces use the same permission predicate", () => {
  it("an org owner sees hrms destinations that a scopeless member cannot access", () => {
    const ownerHrefs = hrefsFrom(getNavGroupsForUser("OWNER", undefined, ["HR"]));
    const memberHrefs = hrefsFrom(getNavGroupsForUser("MEMBER", {}, ["HR"]));

    expect(ownerHrefs).toContain("/hr/employees");
    expect(memberHrefs).not.toContain("/hr/employees");
  });

  it("a narrowly-scoped member sees only the destinations their granted permission unlocks", () => {
    const hrefs = hrefsFrom(
      getNavGroupsForUser("MEMBER", scopesOf(["hr:employees:view"]), ["HR"]),
    );

    expect(hrefs).toContain("/hr/employees");
    expect(hrefs).not.toContain("/crm/leads");
    expect(hrefs).not.toContain("/build/all-work");
  });

  it("a member with no scopes sees no module-gated destinations across any surface", () => {
    const hrefs = hrefsFrom(getNavGroupsForUser("MEMBER", {}, ["HR", "CRM", "BUILD"]));

    expect(hrefs).not.toContain("/hr/employees");
    expect(hrefs).not.toContain("/crm/leads");
    expect(hrefs).not.toContain("/build/all-work");
  });

  it("sidebar and product-switcher result is always a subset of the command-palette result for the same credentials", () => {
    const scopes = scopesOf(["hr:employees:view", "hr:attendance:view"]);
    const enabledModules = ["HR"];

    const paletteHrefs = hrefsFrom(getNavGroupsForUser("MEMBER", scopes, enabledModules));
    const sidebarHrefs = hrefsFrom(
      getNavGroupsForProduct("hrms", "MEMBER", scopes, enabledModules),
    );

    expect(sidebarHrefs.length).toBeGreaterThan(0);
    for (const href of sidebarHrefs) {
      expect(paletteHrefs).toContain(href);
    }
  });
});
