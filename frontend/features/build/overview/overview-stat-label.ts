export function resolveOverviewStatLabel(count: number, hasMore: boolean): string | number {
  if (hasMore) return `${count}+`;
  return count;
}
