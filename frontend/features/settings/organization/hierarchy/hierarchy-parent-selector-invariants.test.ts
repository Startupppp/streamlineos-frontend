import { readFileSync } from "node:fs";
import { join } from "node:path";

const FRONTEND_ROOT = process.cwd();
const SELECTOR_SOURCE = readFileSync(
  join(
    FRONTEND_ROOT,
    "components/organization/hierarchy-parent-selector.tsx",
  ),
  "utf8",
);
const HOOK_SOURCE = readFileSync(
  join(FRONTEND_ROOT, "hooks/api/org-hierarchy.ts"),
  "utf8",
);

const PARENT_PAGES = [
  {
    fileName: "branches-page.tsx",
    formFileName: "branch-form.tsx",
    removedHook: "useBusinessUnits(",
    parentKind: 'parentKind="BUSINESS_UNIT"',
    parentName: "businessUnitName",
  },
  {
    fileName: "departments-page.tsx",
    formFileName: "department-form.tsx",
    removedHook: "useOrgBranches({",
    parentKind: 'parentKind="BRANCH"',
    parentName: "branchName",
  },
  {
    fileName: "teams-page.tsx",
    formFileName: "team-form.tsx",
    removedHook: "useOrgDepartments({",
    parentKind: 'parentKind="DEPARTMENT"',
    parentName: "departmentName",
  },
];

describe("hierarchy parent selector invariants", () => {
  it("server-searches a bounded cursor feed with exact settings access", () => {
    expect(HOOK_SOURCE).toContain('useCan("settings:view")');
    expect(HOOK_SOURCE).toContain("HIERARCHY_PARENT_PAGE_SIZE = 25");
    expect(HOOK_SOURCE).toContain("getNextPageParam:");
    expect(HOOK_SOURCE).toContain('status: "ACTIVE"');
    expect(HOOK_SOURCE).toContain("enabled: canView && enabled");
  });

  it("debounces search, exposes cursor continuation, and preserves selection", () => {
    expect(SELECTOR_SOURCE).toContain("useDebouncedValue(search, 300)");
    expect(SELECTOR_SOURCE).toContain("optionsQuery.fetchNextPage()");
    expect(SELECTOR_SOURCE).toContain("mergeHierarchyParentOptions");
    expect(SELECTOR_SOURCE).toContain("rememberedSelection");
    expect(SELECTOR_SOURCE).toContain('role="combobox"');
    expect(SELECTOR_SOURCE).toContain("optionsQuery.isError");
  });

  it.each(PARENT_PAGES)(
    "$fileName removes the first-page parent preload",
    ({ fileName, formFileName, removedHook, parentKind, parentName }) => {
      const pageSource = readFileSync(
        join(
          FRONTEND_ROOT,
          "features/settings/organization/hierarchy",
          fileName,
        ),
        "utf8",
      );
      const formSource = readFileSync(
        join(
          FRONTEND_ROOT,
          "features/settings/organization/hierarchy",
          formFileName,
        ),
        "utf8",
      );
      const composedFeatureSource = `${pageSource}\n${formSource}`;

      expect(formSource).toContain(parentKind);
      expect(composedFeatureSource).toContain(parentName);
      expect(pageSource).not.toContain(removedHook);
    },
  );
});
