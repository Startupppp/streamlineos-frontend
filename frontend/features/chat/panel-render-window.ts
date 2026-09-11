"use client";

import { useCallback, useState } from "react";

export const PANEL_RENDER_PAGE_SIZE = 25;

export interface PanelRenderWindow {
  visibleCount: number;
  heldCount: number;
  windowStart: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

/**
 * The chat side panels read through `useInfiniteQuery`, so their pages
 * accumulate. Re-opening a panel restores every page fetched earlier in the
 * session at once, and the previous markup mounted all of them — the mounted
 * row count was a function of how far the reader had ever paged rather than of
 * the viewport.
 *
 * The rendered slice is bounded instead, and the panel's single control reveals
 * what is already held before it asks the server for another page, so one click
 * never both fetches a page and mounts it, and nothing is skipped between a
 * reveal and the fetch that follows it.
 */
export function resolvePanelVisibleCount(total: number, pagesShown: number): number {
  return Math.min(Math.max(0, total), Math.max(1, pagesShown) * PANEL_RENDER_PAGE_SIZE);
}

/**
 * Saved messages and shared files read newest-first and window the head; thread
 * replies read oldest-first and window the tail, so they slice from here.
 */
export function resolvePanelWindowStart(total: number, pagesShown: number): number {
  return Math.max(0, total) - resolvePanelVisibleCount(total, pagesShown);
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
  const [pagesShown, setPagesShown] = useState(1);
  const [openedFor, setOpenedFor] = useState(resetKey);

  if (openedFor !== resetKey) {
    setOpenedFor(resetKey);
    setPagesShown(1);
  }

  const effectivePages = openedFor === resetKey ? pagesShown : 1;
  const visibleCount = resolvePanelVisibleCount(total, effectivePages);
  const heldCount = Math.max(0, total) - visibleCount;

  const onLoadMore = useCallback(() => {
    setPagesShown((p) => p + 1);
    if (heldCount === 0) fetchNextPage();
  }, [heldCount, fetchNextPage]);

  return {
    visibleCount,
    heldCount,
    windowStart: Math.max(0, total) - visibleCount,
    hasMore: heldCount > 0 || hasNextPage,
    onLoadMore,
  };
}
