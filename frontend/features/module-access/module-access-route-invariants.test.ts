import { readFileSync } from "node:fs";
import { join } from "node:path";

const ACCESS_ROUTES = [
  "accounting",
  "build",
  "crm",
  "home",
  "hr",
  "inventory",
  "payroll",
  "sign",
  "support",
  "surveys",
  "timesheets",
] as const;

describe("module access route policy", () => {
  it.each(ACCESS_ROUTES)(
    "%s delegates authorization UX to the shared ModuleAccessPage",
    (moduleKey) => {
      const source = readFileSync(
        join(
          process.cwd(),
          "app",
          "(authenticated)",
          moduleKey,
          "access",
          "page.tsx",
        ),
        "utf8",
      );

      expect(source).toContain(
        'import { ModuleAccessPage } from "@/features/module-access/module-access-page";',
      );
      expect(source).toContain(
        `await requirePermission("${moduleKey}:access:view");`,
      );
      expect(source).toContain(`<ModuleAccessPage moduleKey="${moduleKey}"`);
      expect(source).not.toContain("OwnershipSection");
      expect(source).not.toContain("ModuleMembersTab");
      expect(source).not.toContain("RolesTab");
    },
  );
});
