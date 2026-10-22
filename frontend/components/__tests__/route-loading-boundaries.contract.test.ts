import {
  analyzeRouteLoadingBoundaries,
  findNearestBoundary,
} from "@/test-utils/route-loading-boundaries";

const coverage = analyzeRouteLoadingBoundaries();

describe("the boundary census sees a real route tree", () => {
  it("finds the authenticated routes it is supposed to be judging", () => {
    expect(coverage.routes.length).toBeGreaterThanOrEqual(500);
  });

  it("finds the boundaries it is supposed to be crediting", () => {
    expect(coverage.boundaries.length).toBeGreaterThanOrEqual(300);
  });

  it("the five segment roots that carry a shared loading boundary are present", () => {
    for (const segment of [
      "accounting",
      "blog",
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
