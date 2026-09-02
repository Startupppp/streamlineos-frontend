export const INBOX_FETCH_PAGE_SIZE = 30;
export const INBOX_RENDER_PAGE_SIZE = 30;

/**
 * The Build inbox asked for `limit: 100` on a single non-cursor read, so it both
 * mounted 100 rows at once and made notification 101 unreachable — the Mentions
 * tab was worse again, because it filters that same fixed page client-side, so a
 * mention older than the newest 100 notifications could not be reached at all.
 *
 * It now reads the cursor-paginated route and renders a bounded slice of the
 * accumulated pages. The single control reveals what is already held before it
 * asks for another page, so one click never both fetches and mounts a page.
 */
export function resolveInboxVisibleCount(total: number, pagesShown: number): number {
  return Math.min(Math.max(0, total), Math.max(1, pagesShown) * INBOX_RENDER_PAGE_SIZE);
}
