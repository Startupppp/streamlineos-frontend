export function exclusiveCollapsedGroups(
  labels: string[],
  openLabel: string | null,
): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const label of labels) {
    next[label] = openLabel === null ? true : label !== openLabel;
  }
  return next;
}

export function isSidebarGroupOpen(
  collapsedGroups: Record<string, boolean>,
  label: string,
): boolean {
  return collapsedGroups[label] !== true;
}

export function resolveExclusiveOpenLabel(
  labels: string[],
  collapsedGroups: Record<string, boolean>,
  preferred: string | null,
): string | null {
  if (labels.length === 0) return null;
  if (preferred && labels.includes(preferred)) return preferred;
  const alreadyOpen = labels.find((label) =>
    isSidebarGroupOpen(collapsedGroups, label),
  );
  return alreadyOpen ?? labels[0] ?? null;
}
