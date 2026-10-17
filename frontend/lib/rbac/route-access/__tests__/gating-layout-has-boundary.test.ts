import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * HRMS-E2E-028. Opening `/hr/employees` as a member showed the Time Off page
 * they were leaving for a moment before the access-denied redirect landed.
 *
 * The denial is a server redirect from a layout — `enforceRouteAccess` ends in
 * `redirect("/access-denied?…")` — and during a client navigation React keeps
 * the previously committed tree painted until the server answers. A layout that
 * can redirect therefore needs a Suspense boundary *above* it, or the last
 * route's content stands in for the wait.
 *
 * The subtlety that made this survive: `loading.tsx` is the fallback for its
 * segment's **children**, so a segment's own `loading.tsx` sits *below* its
 * `layout.tsx` and fires only once the gate has already passed. That is why
 * `/hr/leaves → /hr/employees` never flashed and `/me/time-off → /hr/employees`
 * did. The boundary has to come from the parent segment.
 *
 * The flash itself is a browser check (FE-123): jsdom has no Next router, no RSC
 * transition and no paint, so a rendering test here would pass against the
 * broken tree as readily as the fixed one. What is checkable is the invariant —
 * every gating layout has something above it to suspend into.
 */
const AUTHENTICATED = resolve(__dirname, "../../../../app/(authenticated)");

/** A layout that can answer with a redirect rather than with markup. */
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
    // The paired positive. Without it this whole file passes on a repo where
    // the directory moved and nothing was scanned at all.
    expect(segmentsWithGatingLayout().length).toBeGreaterThan(0);
  });

  it("includes /hr, the segment the ticket was reported against", () => {
    expect(segmentsWithGatingLayout()).toContain("hr");
  });

  it("has a loading boundary at the group segment, above every gating layout", () => {
    // One file covers all of them: a child segment's own loading.tsx sits below
    // its layout and cannot stand in while that layout decides.
    expect(existsSync(join(AUTHENTICATED, "loading.tsx"))).toBe(true);
  });

  it("keeps that boundary generic, because it stands in for every product", () => {
    // Comments are stripped first: the file explains the ticket, and the ticket
    // is about access denial, so an assertion over the raw text would match the
    // prose rather than the markup — which is exactly what it did at first.
    const source = readFileSync(join(AUTHENTICATED, "loading.tsx"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

    expect(source).toMatch(/Skeleton/);
    // It must not claim an answer it does not have — rendering a denial here
    // would be FE-42 in reverse.
    expect(source).not.toMatch(/NoPermissionState|Access denied|access-denied/);
  });
});
