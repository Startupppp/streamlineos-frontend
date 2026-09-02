export const MESSAGE_RENDER_PAGE_SIZE = 60;

/**
 * `useChatMessages` sends no `limit` and its pages accumulate, so a channel that
 * has been read back far enough holds its whole history client-side and the
 * message list mounts every message in it.
 *
 * Chat reads newest-last, so the window is a tail: the newest
 * `pagesShown * MESSAGE_RENDER_PAGE_SIZE` messages, and "Load older messages"
 * widens it before asking the server for another page.
 *
 * The trap is the unread divider. It is drawn on one specific message, and if
 * the window starts after it the divider silently disappears — the reader is
 * told they have no unread messages when they do. So the window always reaches
 * back far enough to include it.
 */
export function resolveMessageWindowStart(
  messageCount: number,
  pagesShown: number,
  firstUnreadIndex: number,
): number {
  const target = Math.max(1, pagesShown) * MESSAGE_RENDER_PAGE_SIZE;
  if (messageCount <= target) return 0;
  const tailStart = messageCount - target;
  if (firstUnreadIndex < 0) return tailStart;
  return Math.min(tailStart, firstUnreadIndex);
}
