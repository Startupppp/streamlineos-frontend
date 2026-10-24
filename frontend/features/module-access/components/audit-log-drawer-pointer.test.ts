import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ADMINISTRATION_NAV_GROUPS } from "@/components/layout/sidebar/sidebar-nav-groups-administration";

describe("the module access audit log points at a page that exists", () => {
  it("names the org audit log by the group and label the sidebar shows", () => {
    const security = ADMINISTRATION_NAV_GROUPS.find((group) => group.label === "Security");
    const auditLogs = security?.routes.find((route) => route.href === "/settings/audit-log");
    const drawer = readFileSync(resolve(__dirname, "audit-log-drawer.tsx"), "utf8");

    expect(auditLogs?.label).toBe("Audit Logs");
    expect(drawer).toContain(`see Administration → ${security?.label} → ${auditLogs?.label}.`);
    expect(drawer).not.toContain("see Settings → Audit log");
  });
});
