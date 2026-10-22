"use client";

import { useCallback, useState } from "react";

const PANEL_RENDER_PAGE_SIZE = 25;

interface PanelRenderWindow {
  visibleCount: number;
  heldCount: number;
  windowStart: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

function resolvePanelVisibleCount(total: number, pagesShown: number): number {
  return Math.min(Math.max(0, total), Math.max(1, pagesShown) * PANEL_RENDER_PAGE_SIZE);
}

export function panelRevealLabel(
  window: PanelRenderWindow,
  total: number,
  isFetching: boolean,
  fetchLabel: string,
): string {
  if (window.heldCount > 0)
    return `Show ${Math.min(window.heldCount, PANEL_RENDER_PAGE_SIZE)} more (${window.visibleCount} of ${total})`;
  return isFetching ? "Loading…" : fetchLabel;
}

export const NO_CURSOR_PAGE = () => undefined;

export function usePanelRenderWindow(
  total: number,
  hasNextPage: boolean,
  fetchNextPage: () => void,
  resetKey = 0,
): PanelRenderWindow {
  const [windowState, setWindowState] = useState({ resetKey, pagesShown: 1 });
  const effectivePages =
    windowState.resetKey === resetKey ? windowState.pagesShown : 1;
  const visibleCount = resolvePanelVisibleCount(total, effectivePages);
  const heldCount = Math.max(0, total) - visibleCount;

  const onLoadMore = useCallback(() => {
    setWindowState((current) => ({
      resetKey,
      pagesShown:
        (current.resetKey === resetKey ? current.pagesShown : 1) + 1,
    }));
    if (heldCount === 0) fetchNextPage();
  }, [heldCount, fetchNextPage, resetKey]);

  return {
    visibleCount,
    heldCount,
    windowStart: Math.max(0, total) - visibleCount,
    hasMore: heldCount > 0 || hasNextPage,
    onLoadMore,
  };
}
