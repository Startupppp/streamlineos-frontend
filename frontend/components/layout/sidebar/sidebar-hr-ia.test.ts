import { ORG_MODULE_NAME } from "@/lib/org-module-keys";
import {
  flattenNavRoutes,
  getNavGroupsForProduct,
  resolveNavRouteAccess,
} from "./sidebar-nav-items";
import {
  applyHrWeekOneNav,
  HR_NAV_ADVANCED_HREFS,
  HR_NAV_CHROME_KILLS,
} from "./hr-week-one-nav";
import { HOME_NAV_GROUPS } from "./sidebar-home-nav";
import { HR_NAV_GROUPS } from "./sidebar-nav-groups-hr";
import type { NavGroup, NavRoute } from "./sidebar-nav-types";

const EVERY_MODULE = [...Object.keys(ORG_MODULE_NAME), "timesheets", "workflows"];

function founderAdminGroups(showAdvanced: boolean): NavGroup[] {
  return applyHrWeekOneNav(
    getNavGroupsForProduct("hrms", "OWNER", {}, EVERY_MODULE),
    showAdvanced,
  );
}

function hrefsOf(groups: NavGroup[]): string[] {
  return groups.flatMap((group) => flattenNavRoutes(group.routes)).map((route) => route.href);
}

function findRoute(groups: NavGroup[], href: string): NavRoute | undefined {
  return groups
    .flatMap((group) => flattenNavRoutes(group.routes))
    .find((route) => route.href === href);
}

describe("HRMS-UX-001 — the default visible HR tree is a lean founder tree", () => {
  const visible = founderAdminGroups(false);

  it("gives a founder-admin at most eight top-level HR groups", () => {
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThanOrEqual(8);
  });

  it("orders the groups as the IA declares", () => {
    expect(visible.map((group) => group.label)).toEqual([
      "HR Overview",
      "HR People",
      "Lifecycle",
      "Time",
      "Documents",
      "People Ops",
      "Insights",
      "Settings",
    ]);
  });

  it("puts the Action Center second in Overview, on the approver union it needs", () => {
    const overview = visible[0];
    expect(overview.routes[1]).toMatchObject({
      label: "Action Center",
      href: "/hr/approvals",
      requiredPermission: ["hr:workflows:approve", "hr:leaves:approve"],
    });
  });

  it("keeps every default-hidden route out of the visible tree and in advanced", () => {
    const visibleHrefs = new Set(hrefsOf(visible));
    const advancedHrefs = new Set(hrefsOf(founderAdminGroups(true)));

    for (const href of HR_NAV_ADVANCED_HREFS) {
      expect(visibleHrefs.has(href)).toBe(false);
      expect(advancedHrefs.has(href)).toBe(true);
    }
  });

  it("leaves every default-hidden route reachable by deep link", () => {
    for (const href of HR_NAV_ADVANCED_HREFS) {
      expect(resolveNavRouteAccess(href).matched).toBe(true);
    }
  });
});

describe("HRMS-UX-010 — the locked chrome kills are executed in HR nav", () => {
  it.each([false, true])(
    "keeps the killed hrefs out of the HR tree (advanced=%s)",
    (showAdvanced) => {
      const hrefs = new Set(hrefsOf(founderAdminGroups(showAdvanced)));

      for (const href of ["/hr/service-delivery", "/hr/reimbursements", "/hr/simulator"]) {
        expect(hrefs.has(href)).toBe(false);
      }
    },
  );

  it("names /hr/settings/company among the kills although no nav entry declares it", () => {
    expect(HR_NAV_CHROME_KILLS).toContain("/hr/settings/company");
    expect(hrefsOf(HR_NAV_GROUPS)).not.toContain("/hr/settings/company");
  });

  it("points reimbursements at the payroll product instead", () => {
    const payroll = hrefsOf(getNavGroupsForProduct("payroll", "OWNER", {}, EVERY_MODULE));
    expect(payroll).toContain("/payroll/reimbursements");
  });

  it("keeps the killed routes reachable by deep link rather than deleted", () => {
    for (const href of ["/hr/service-delivery", "/hr/reimbursements", "/hr/simulator"]) {
      expect(resolveNavRouteAccess(href).matched).toBe(true);
    }
  });

  it("puts Devices and Biometric under one Time clocks parent", () => {
    const time = founderAdminGroups(false).find((group) => group.label === "Time");
    const timeClocks = time?.routes.find((route) => route.label === "Time clocks");

    expect(timeClocks?.children?.map((child) => child.href)).toEqual([
      "/hr/devices",
      "/hr/biometric",
    ]);
    expect(
      time?.routes.filter((route) => route.href === "/hr/biometric"),
    ).toEqual([]);
  });

  it("leaves Announcements to Home → Company only", () => {
    expect(hrefsOf(HR_NAV_GROUPS)).not.toContain("/hr/announcements");
    expect(hrefsOf(HOME_NAV_GROUPS)).toContain("/hr/announcements");
  });

  it("keeps Cases as the canonical People Ops entry", () => {
    expect(findRoute(founderAdminGroups(false), "/hr/cases")?.label).toBe("Cases");
  });
});
