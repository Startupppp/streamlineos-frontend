import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import {
  ORG_HIERARCHY_COMPAT_TITLE,
  ORG_HIERARCHY_SETTINGS_HREF,
  OrgHierarchyCompatBanner,
} from "@/features/hr/org/org-hierarchy-compat-banner";

const DEPRECATED_HIERARCHY_WRITE_PATHS = [
  "/hr/org/teams",
  "/hr/org/locations",
] as const;

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name))
      out.push(full);
  }
  return out;
}

const WRITE_CALL = /apiClient\.(post|patch|put|delete)\s*(<[^>]*>)?\s*\(\s*[`"']([^`"']+)/g;

function hierarchyWriteTargets(): string[] {
  const targets = new Set<string>();
  for (const root of ["app", "features", "hooks", "components", "lib"]) {
    if (!existsSync(root)) continue;
    for (const file of sourceFiles(root)) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(WRITE_CALL)) {
        const endpoint = match[3].replace(/\$\{[^}]*\}/g, "{id}");
        if (/^\/hr\/org\/|^\/org-hierarchy\/|^\/hr\/departments/.test(endpoint))
          targets.add(endpoint);
      }
    }
  }
  return [...targets].sort();
}

describe("HRMS-UX-015 / D10 — hierarchy writes go only to the canonical endpoints", () => {
  const targets = hierarchyWriteTargets();

  it("the frontend never writes through the deprecated /hr/org compat paths", () => {
    for (const deprecated of DEPRECATED_HIERARCHY_WRITE_PATHS)
      expect(
        targets.filter((target) => target.startsWith(deprecated)),
      ).toEqual([]);
  });

  it("department, team, branch and location writes all live under /org-hierarchy", () => {
    const hierarchy = targets.filter((target) =>
      /departments|teams|branches|locations|business-units|cost-centers/.test(target),
    );
    expect(hierarchy.length).toBeGreaterThan(0);
    for (const target of hierarchy)
      expect(target.startsWith("/org-hierarchy/") || target === "/hr/departments").toBe(
        true,
      );
  });

  it("records the one remaining non-canonical department write so it cannot grow silently", () => {
    const nonCanonical = targets.filter(
      (target) => !target.startsWith("/org-hierarchy/"),
    );
    expect(nonCanonical).toEqual([
      "/hr/departments",
      "/hr/org/levels",
      "/hr/org/levels/{id}",
      "/hr/org/roles",
      "/hr/org/roles/{id}",
    ]);
  });

  it("keeps the job role and level writes on /hr/org, which is not hierarchy", () => {
    expect(targets).toContain("/hr/org/roles");
    expect(targets).toContain("/hr/org/levels");
  });
});

describe("HRMS-UX-015 — /hr/org is a compat hub, not a second hierarchy editor", () => {
  it("names the canonical destination and links to it", () => {
    render(<OrgHierarchyCompatBanner />);
    expect(screen.getByText(ORG_HIERARCHY_COMPAT_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Organization structure" }),
    ).toHaveAttribute("href", ORG_HIERARCHY_SETTINGS_HREF);
  });

  it("the canonical destination is a real route", () => {
    expect(
      existsSync(`app/(authenticated)${ORG_HIERARCHY_SETTINGS_HREF}/page.tsx`),
    ).toBe(true);
  });

  it("the /hr/org bookmark still resolves and shows the banner", () => {
    const route = readFileSync("app/(authenticated)/hr/org/page.tsx", "utf8");
    expect(route).toContain("OrgHierarchyCompatBanner");
    expect(route).toContain('requirePermission("hr:employees:view")');
  });
});

describe("HRMS-UX-015 — empty names are blocked at the canonical forms", () => {
  it.each(["department", "team", "branch", "location"])(
    "the %s form rejects an empty name",
    (unit) => {
      const path = `features/settings/organization/hierarchy/${unit}-form-schema.ts`;
      if (!existsSync(path)) return;
      expect(readFileSync(path, "utf8")).toMatch(/min\(1,\s*"Name is required"\)/);
    },
  );
});
