import {
  analyzeRouteLoadingBoundaries,
  findNearestBoundary,
} from "@/test-utils/route-loading-boundaries";

/**
 * PRD-C150's navigation clause, measured where the router actually decides it.
 *
 * "Show navigation, skeleton, optimistic or queued feedback within 100 ms of
 * user intent" is not a property of the 177 `router.push` call sites or the
 * 226 `<Link>`s. It is a property of the DESTINATION: with a `loading.tsx`
 * boundary above it, React swaps in the skeleton in the same commit the
 * navigation starts; without one the App Router holds the previous page
 * painted until the server segment resolves, and the click looks ignored for
 * however long that takes. One boundary covers every trigger that can reach
 * the segment beneath it, which is why this is a route census rather than a
 * call-site census.
 *
 * A floor, not a ratchet. The number here is zero and the only honest way to
 * keep it zero is to add a boundary — there is no baseline to raise.
 */
const coverage = analyzeRouteLoadingBoundaries();

describe("the boundary census sees a real route tree", () => {
  it("finds the authenticated routes it is supposed to be judging", () => {
    expect(coverage.routes.length).toBeGreaterThanOrEqual(500);
  });

  it("finds the boundaries it is supposed to be crediting", () => {
    expect(coverage.boundaries.length).toBeGreaterThanOrEqual(300);
  });

  it("the six segment roots that covered 101 routes between them are present", () => {
    for (const segment of [
      "accounting",
      "blog",
      "build",
      "me",
      "portal",
      "subjects",
    ])
      expect(coverage.boundaries).toContain(`${segment}/loading.tsx`);
  });
});

describe("every authenticated route paints a skeleton while it loads", () => {
  it("no route is left without a loading.tsx at or above it", () => {
    expect(coverage.uncovered).toEqual([]);
  });
});

describe("boundary walk self-test — the verdict is reached for the stated reason", () => {
  const tree = (present: string[]) => (directory: string) =>
    present.includes(directory);

  it("credits a boundary sitting in the route's own directory", () => {
    expect(
      findNearestBoundary("/app/hr/leaves", "/app", tree(["/app/hr/leaves"])),
    ).toBe("/app/hr/leaves");
  });

  it("credits an ancestor boundary, because a segment covers everything nested beneath it", () => {
    expect(
      findNearestBoundary("/app/hr/leaves/analytics", "/app", tree(["/app/hr"])),
    ).toBe("/app/hr");
  });

  it("credits the segment root itself", () => {
    expect(findNearestBoundary("/app/hr", "/app", tree(["/app"]))).toBe("/app");
  });

  it("returns null when nothing on the path has one", () => {
    expect(
      findNearestBoundary("/app/hr/leaves", "/app", tree(["/other"])),
    ).toBeNull();
  });

  it("does not walk above the segment root looking for a boundary that cannot apply", () => {
    expect(
      findNearestBoundary("/app/hr", "/app", tree(["/"])),
    ).toBeNull();
  });

  it("a sibling's boundary is not this route's boundary", () => {
    expect(
      findNearestBoundary("/app/hr/leaves", "/app", tree(["/app/hr/payroll"])),
    ).toBeNull();
  });
});
