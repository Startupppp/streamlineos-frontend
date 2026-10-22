const MESSAGE_RENDER_PAGE_SIZE = 60;

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
