import { ORG_MODULE_NAME } from "@/lib/org-module-keys";
import { getNavGroupsForModule } from "../sidebar/sidebar-nav-items";
import { getMobileGroupTabs, usesMobileGroupTabs } from "./mobile-module-nav-items";

const EVERY_MODULE = [...Object.keys(ORG_MODULE_NAME), "timesheets", "workflows"];
const payroll = getNavGroupsForModule("payroll", "OWNER", {}, EVERY_MODULE);
const hr = getNavGroupsForModule("hrms", "OWNER", {}, EVERY_MODULE);

describe("mobile bottom bar for grouped products", () => {
  it("shows one tab per HR and Payroll group, five at most", () => {
    expect(usesMobileGroupTabs("payroll", payroll)).toBe(true);
    expect(usesMobileGroupTabs("hrms", hr)).toBe(true);
    expect(getMobileGroupTabs(hr, "/hr").map((tab) => tab.route.label)).toEqual([
      "HR Overview",
      "HR People",
      "Time Off & Attendance",
      "People Ops",
      "Settings",
    ]);
  });

  it("marks the group that owns the deepest matching route, not the one whose first link is a prefix", () => {
    const tabs = getMobileGroupTabs(payroll, "/payroll/templates/12");
    expect(tabs.filter((tab) => tab.isActive).map((tab) => tab.route.label)).toEqual(["Salaries"]);
    expect(tabs.find((tab) => tab.route.label === "Salaries")?.route.href).toBe("/payroll/employees");
  });

  it("keeps per-route tabs for products that are not grouped", () => {
    expect(usesMobileGroupTabs("crm", payroll)).toBe(false);
  });
});
