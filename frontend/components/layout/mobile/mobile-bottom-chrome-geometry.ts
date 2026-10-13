export const NAV_HEIGHT_PX = 64;
export const FAB_SIZE_PX = 44;
export const FAB_MARGIN_PX = 8;
export const LAUNCHER_MARGIN_PX = 4;

export function fabBottomCssPx(navShown: boolean): number {
  return navShown ? NAV_HEIGHT_PX + FAB_MARGIN_PX : FAB_MARGIN_PX * 2;
}

export function launcherBottomCssPx(navShown: boolean): number {
  return navShown
    ? NAV_HEIGHT_PX + FAB_MARGIN_PX + FAB_SIZE_PX + LAUNCHER_MARGIN_PX
    : FAB_MARGIN_PX * 2 + FAB_SIZE_PX + LAUNCHER_MARGIN_PX;
}

export function scrollGutterCssPx(navShown: boolean): number {
  const fabTopFromBottom = (navShown ? NAV_HEIGHT_PX + FAB_MARGIN_PX : FAB_MARGIN_PX * 2) + FAB_SIZE_PX;
  return fabTopFromBottom + FAB_MARGIN_PX;
}

export type ChromeRect = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export function rectsIntersect(a: ChromeRect, b: ChromeRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function computeBottomChromeRects(params: {
  viewportWidth: number;
  viewportHeight: number;
  safeAreaBottom: number;
  navShown: boolean;
  fabRightOffset?: number;
  launcherWidth?: number;
  launcherHeight?: number;
  launcherRightOffset?: number;
}): {
  nav: ChromeRect | null;
  fab: ChromeRect;
  launcher: ChromeRect;
} {
  const {
    viewportWidth,
    viewportHeight,
    safeAreaBottom,
    navShown,
    fabRightOffset = 16,
    launcherWidth = 162,
    launcherHeight = 100,
    launcherRightOffset = 8,
  } = params;

  const nav: ChromeRect | null = navShown
    ? {
        top: viewportHeight - NAV_HEIGHT_PX - safeAreaBottom,
        bottom: viewportHeight,
        left: 0,
        right: viewportWidth,
      }
    : null;

  const fabBottomEdge = viewportHeight - fabBottomCssPx(navShown) - safeAreaBottom;
  const fab: ChromeRect = {
    top: fabBottomEdge - FAB_SIZE_PX,
    bottom: fabBottomEdge,
    left: viewportWidth - fabRightOffset - FAB_SIZE_PX,
    right: viewportWidth - fabRightOffset,
  };

  const launcherBottomEdge = viewportHeight - launcherBottomCssPx(navShown) - safeAreaBottom;
  const launcher: ChromeRect = {
    top: launcherBottomEdge - launcherHeight,
    bottom: launcherBottomEdge,
    left: viewportWidth - launcherRightOffset - launcherWidth,
    right: viewportWidth - launcherRightOffset,
  };

  return { nav, fab, launcher };
}
