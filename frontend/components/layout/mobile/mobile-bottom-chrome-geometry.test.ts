import {
  computeBottomChromeRects,
  rectsIntersect,
  FAB_SIZE_PX,
  FAB_MARGIN_PX,
  LAUNCHER_MARGIN_PX,
  NAV_HEIGHT_PX,
  fabBottomCssPx,
  launcherBottomCssPx,
  scrollGutterCssPx,
} from "./mobile-bottom-chrome-geometry";

const TOUCH_TARGET_PX = 44;

const STANDARD_CASES = [
  { viewportWidth: 375, viewportHeight: 667, safeAreaBottom: 0, navShown: true },
  { viewportWidth: 375, viewportHeight: 667, safeAreaBottom: 34, navShown: true },
  { viewportWidth: 375, viewportHeight: 667, safeAreaBottom: 0, navShown: false },
  { viewportWidth: 375, viewportHeight: 667, safeAreaBottom: 34, navShown: false },
  { viewportWidth: 375, viewportHeight: 812, safeAreaBottom: 34, navShown: true },
  { viewportWidth: 414, viewportHeight: 896, safeAreaBottom: 34, navShown: true },
];

describe("bottom chrome geometry — pairwise disjoint rects", () => {
  for (const params of STANDARD_CASES) {
    const label = `${params.viewportWidth}×${params.viewportHeight} sa=${params.safeAreaBottom} nav=${params.navShown}`;

    it(`nav, FAB and launcher occupy disjoint rects: ${label}`, () => {
      const { nav, fab, launcher } = computeBottomChromeRects(params);
      if (nav) {
        expect(rectsIntersect(nav, fab)).toBe(false);
        expect(rectsIntersect(nav, launcher)).toBe(false);
      }
      expect(rectsIntersect(fab, launcher)).toBe(false);
    });

    it(`FAB meets ${TOUCH_TARGET_PX}×${TOUCH_TARGET_PX} touch target: ${label}`, () => {
      const { fab } = computeBottomChromeRects(params);
      expect(fab.bottom - fab.top).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
      expect(fab.right - fab.left).toBeGreaterThanOrEqual(TOUCH_TARGET_PX);
    });
  }
});

describe("bottom chrome geometry — gap invariants (nav shown, safe-area 0)", () => {
  const BASE = { viewportWidth: 375, viewportHeight: 667, safeAreaBottom: 0, navShown: true };

  it("FAB bottom edge is FAB_MARGIN_PX above the nav top edge", () => {
    const { nav, fab } = computeBottomChromeRects(BASE);
    expect(nav!.top - fab.bottom).toBe(FAB_MARGIN_PX);
  });

  it("launcher bottom edge is LAUNCHER_MARGIN_PX above the FAB top edge", () => {
    const { fab, launcher } = computeBottomChromeRects(BASE);
    expect(fab.top - launcher.bottom).toBe(LAUNCHER_MARGIN_PX);
  });

  it("safe-area shifts all three controls up by exactly safeAreaBottom", () => {
    const safe = computeBottomChromeRects({ ...BASE, safeAreaBottom: 34 });
    const base = computeBottomChromeRects(BASE);
    expect(base.fab.bottom - safe.fab.bottom).toBe(34);
    expect(base.launcher.bottom - safe.launcher.bottom).toBe(34);
    expect(base.nav!.top - safe.nav!.top).toBe(34);
  });
});

describe("bottom chrome geometry — drag clamp consistency", () => {
  it("FAB default CSS bottom matches the nav obstruction used by the drag clamp", () => {
    const navObstruction = NAV_HEIGHT_PX;
    const fabCssBottom = fabBottomCssPx(true);
    expect(fabCssBottom).toBe(navObstruction + FAB_MARGIN_PX);
  });

  it("launcher default CSS bottom equals the full stacked offset when nav shown", () => {
    const expected = NAV_HEIGHT_PX + FAB_MARGIN_PX + FAB_SIZE_PX + LAUNCHER_MARGIN_PX;
    expect(launcherBottomCssPx(true)).toBe(expected);
  });

  it("a FAB position that would overlap the nav is rejected by the nav-shown clamp", () => {
    const h = 667;
    const sa = 0;
    const { nav, fab } = computeBottomChromeRects({
      viewportWidth: 375,
      viewportHeight: h,
      safeAreaBottom: sa,
      navShown: true,
    });
    expect(fab.bottom).toBeLessThan(nav!.top);
  });

  it("a launcher position that would overlap the FAB is rejected by the compact clamp", () => {
    const h = 667;
    const { fab, launcher } = computeBottomChromeRects({
      viewportWidth: 375,
      viewportHeight: h,
      safeAreaBottom: 0,
      navShown: true,
    });
    expect(launcher.bottom).toBeLessThan(fab.top);
  });
});

describe("bottom chrome geometry — scroll gutter", () => {
  it("gutter when nav shown clears the FAB default top edge by FAB_MARGIN_PX", () => {
    const fabTopFromBottom = fabBottomCssPx(true) + FAB_SIZE_PX;
    expect(scrollGutterCssPx(true)).toBe(fabTopFromBottom + FAB_MARGIN_PX);
  });

  it("gutter when nav not shown clears the FAB default top edge by FAB_MARGIN_PX", () => {
    const fabTopFromBottom = fabBottomCssPx(false) + FAB_SIZE_PX;
    expect(scrollGutterCssPx(false)).toBe(fabTopFromBottom + FAB_MARGIN_PX);
  });

  it("nav-shown gutter is nav + FAB_MARGIN + FAB_SIZE + FAB_MARGIN", () => {
    expect(scrollGutterCssPx(true)).toBe(
      NAV_HEIGHT_PX + FAB_MARGIN_PX + FAB_SIZE_PX + FAB_MARGIN_PX,
    );
  });
});

describe("rectsIntersect", () => {
  it("returns false for vertically disjoint rects", () => {
    expect(
      rectsIntersect(
        { top: 0, bottom: 10, left: 0, right: 10 },
        { top: 20, bottom: 30, left: 0, right: 10 },
      ),
    ).toBe(false);
  });

  it("returns false for horizontally disjoint rects", () => {
    expect(
      rectsIntersect(
        { top: 0, bottom: 10, left: 0, right: 10 },
        { top: 0, bottom: 10, left: 20, right: 30 },
      ),
    ).toBe(false);
  });

  it("returns true for partially overlapping rects", () => {
    expect(
      rectsIntersect(
        { top: 0, bottom: 20, left: 0, right: 20 },
        { top: 10, bottom: 30, left: 10, right: 30 },
      ),
    ).toBe(true);
  });

  it("returns true when one rect fully contains the other (the pre-fix containment bug)", () => {
    const fabRect = { top: 551, bottom: 591, left: 319, right: 359 };
    const launcherRect = { top: 505, bottom: 595, left: 205, right: 367 };
    expect(rectsIntersect(fabRect, launcherRect)).toBe(true);
  });

  it("returns false for rects that share only an edge (no area overlap)", () => {
    expect(
      rectsIntersect(
        { top: 0, bottom: 10, left: 0, right: 10 },
        { top: 10, bottom: 20, left: 0, right: 10 },
      ),
    ).toBe(false);
  });
});
