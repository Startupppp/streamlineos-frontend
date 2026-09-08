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

function lifecycleSurface(fileName: string): string {
  const source = readFileSync(join(HIERARCHY_DIR, fileName), "utf8");
  const columnSources = [
    ...source.matchAll(/from "\.\/([a-z0-9-]+-columns)"/g),
  ].map((match) => readFileSync(join(HIERARCHY_DIR, `${match[1]}.tsx`), "utf8"));
  return [source, ...columnSources].join("\n");
}

describe("organization hierarchy lifecycle UI", () => {
  it.each(LIFECYCLE_PAGES)(
    "%s uses shared bounded cursor pagination",
    (fileName) => {
      const source = readFileSync(join(HIERARCHY_DIR, fileName), "utf8");

      expect(source).toContain("useHierarchyListState()");
      expect(source).toContain("<CursorPageControls");
      expect(source).toContain(".pageInfo.hasMore");
      expect(source).toContain(".pageInfo.nextCursor");
      expect(source).toContain("onPageSizeChange={setPageSize}");
      expect(source).not.toContain('mode: "server"');
      expect(source).not.toContain(".total");
      expect(source).toContain("<ErrorState");
      expect(source).toContain("description={getErrorMessage(error)}");
      expect(source).toContain("onRetry={handleRetry}");
      expect(source).not.toMatch(/Archived \(\$\{.*\.length\}\)/);
      expect(source).not.toContain('status !== "ARCHIVED"');
      expect(source).not.toContain('status === "ARCHIVED" && !');
    },
  );

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
      const source = lifecycleSurface(fileName);

      expect(source).toContain(
        'const canManage = useCan("settings:organization:manage");',
      );
      expect(source).toMatch(
        /canManage\s*\?\s*\(?\s*<div className="flex items-center gap-1">/,
      );
      expect(source).toMatch(/canManage\s*\?\s*\(?\s*<AnimatedIconButton/);
      expect(source).toMatch(/action=\{\s*canManage(\s*&&\s*[^?]*)?\s*\?/);
    },
  );

  it.each([
    ["branches-page.tsx", "branch-form.tsx"],
    ["departments-page.tsx", "department-form.tsx"],
    ["teams-page.tsx", "team-form.tsx"],
  ])(
    "%s uses the shared server-search parent selector",
    (_pageFileName, formFileName) => {
      const source = readFileSync(join(HIERARCHY_DIR, formFileName), "utf8");

      expect(source).toContain("<HierarchyParentSelector");
      expect(source).toContain("selectedLabel=");
      expect(source).not.toContain(".filter(isAssignableHierarchyParent)");
    },
  );
});
