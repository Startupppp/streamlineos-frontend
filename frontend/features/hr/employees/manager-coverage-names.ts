import type { ManagerCoverageReport } from "@/hooks/api/hr/reporting-lines-schema";

export interface CircularChainRow {
  key: string;
  members: Array<{ userId: string; name: string | null }>;
}

/**
 * The coverage read reports a reporting loop as bare user ids (FE-85 forbids
 * showing them). Names come from wherever the same report already carries them,
 * then from `extraNames` (the org-member lookup); a member neither knows stays
 * nameless and renders as a labelled link, never as its id.
 */
export function circularChainRows(
  report: ManagerCoverageReport,
  extraNames: ReadonlyMap<string, string>,
): CircularChainRow[] {
  const names = new Map(extraNames);
  function remember(userId: string | null, name: string | null) {
    if (userId && name && !names.has(userId)) names.set(userId, name);
  }
  for (const row of report.withoutManager) remember(row.userId, row.name);
  for (const row of report.inactiveManager) {
    remember(row.userId, row.name);
    remember(row.managerUserId, row.managerName);
  }
  for (const row of report.overSpan) remember(row.managerUserId, row.managerName);

  return report.circular.map((cycle) => ({
    key: cycle.userIds.join(">"),
    members: cycle.userIds.map((userId) => ({ userId, name: names.get(userId) ?? null })),
  }));
}
