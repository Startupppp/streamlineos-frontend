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

export function allGroupsOpen(labels: string[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const label of labels) {
    next[label] = false;
  }
  return next;
}

export function mergeCollapsedGroups(
  labels: string[],
  stored: Record<string, boolean> | null | undefined,
): Record<string, boolean> {
  const next = allGroupsOpen(labels);
  if (!stored) return next;
  for (const label of labels) {
    if (stored[label] === true) next[label] = true;
  }
  return next;
}

export function toggleCollapsedGroup(
  collapsedGroups: Record<string, boolean>,
  label: string,
): Record<string, boolean> {
  const currentlyOpen = collapsedGroups[label] !== true;
  return {
    ...collapsedGroups,
    [label]: currentlyOpen,
  };
}
