import { readFileSync } from "node:fs";
import { join } from "node:path";

const HIERARCHY_DIR = join(
  process.cwd(),
  "features/settings/organization/hierarchy",
);

const LIFECYCLE_PAGES = [
  "business-units-page.tsx",
  "branches-page.tsx",
  "departments-page.tsx",
  "teams-page.tsx",
  "locations-page.tsx",
  "cost-centers-page.tsx",
];

describe("organization hierarchy lifecycle UI", () => {
  it.each(LIFECYCLE_PAGES)(
    "%s archives through the shared confirmation and exposes no hard delete",
    (fileName) => {
      const source = readFileSync(join(HIERARCHY_DIR, fileName), "utf8");

      expect(source).toContain("<HierarchyArchiveDialog");
      expect(source).toContain('status: "ARCHIVED"');
      expect(source).not.toMatch(/useDelete(?:BusinessUnit|Org)/);
      expect(source).not.toContain("Delete permanently");
      expect(source).not.toContain("Trash2Icon");
    },
  );

  it.each(LIFECYCLE_PAGES)(
    "%s exposes hierarchy mutations only to organization managers",
    (fileName) => {
      const source = readFileSync(join(HIERARCHY_DIR, fileName), "utf8");

      expect(source).toContain(
        'const canManage = useCan("settings:organization:manage");',
      );
      expect(source).toMatch(
        /canManage\s*\?\s*<div className="flex items-center gap-1">/,
      );
      expect(source).toMatch(/canManage\s*\?\s*<AnimatedIconButton/);
      expect(source).toMatch(/action=\{canManage\s*\?/);
    },
  );

  it.each([
    "branches-page.tsx",
    "departments-page.tsx",
    "teams-page.tsx",
  ])("%s excludes unavailable parents from assignment selectors", (fileName) => {
    const source = readFileSync(join(HIERARCHY_DIR, fileName), "utf8");

    expect(source).toContain(".filter(isAssignableHierarchyParent)");
  });
});
