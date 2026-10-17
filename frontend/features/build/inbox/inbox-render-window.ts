export const INBOX_FETCH_PAGE_SIZE = 30;
export const INBOX_RENDER_PAGE_SIZE = 30;
export const INBOX_MOBILE_RENDER_PAGE_SIZE = 10;


export function resolveInboxVisibleCount(
  total: number,
  pagesShown: number,
  renderPageSize: number = INBOX_RENDER_PAGE_SIZE,
): number {
  return Math.min(Math.max(0, total), Math.max(1, pagesShown) * renderPageSize);
}
