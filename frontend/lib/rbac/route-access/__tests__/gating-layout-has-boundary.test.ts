import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const AUTHENTICATED = resolve(__dirname, "../../../../app/(authenticated)");

const GATES = /enforceRouteAccess|requirePermission|requireModulePermission/;

function segmentsWithGatingLayout(): string[] {
  return readdirSync(AUTHENTICATED, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => {
      const layout = join(AUTHENTICATED, entry.name, "layout.tsx");
      return existsSync(layout) && GATES.test(readFileSync(layout, "utf8"));
    })
    .map((entry) => entry.name);
}

describe("a layout that can redirect has a boundary above it", () => {
  it("finds real gating layouts, so an empty sweep cannot pass", () => {
    expect(segmentsWithGatingLayout().length).toBeGreaterThan(0);
  });

  it("includes /hr, the segment the ticket was reported against", () => {
    expect(segmentsWithGatingLayout()).toContain("hr");
  });

  it("has a loading boundary at the group segment, above every gating layout", () => {
    expect(existsSync(join(AUTHENTICATED, "loading.tsx"))).toBe(true);
  });

  it("keeps that boundary generic, because it stands in for every product", () => {
    const source = readFileSync(join(AUTHENTICATED, "loading.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(source).toMatch(/Skeleton/);
    expect(source).not.toMatch(/NoPermissionState|Access denied|access-denied/);
  });
});
