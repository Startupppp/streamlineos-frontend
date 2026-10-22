import type { ManagerCoverageReport } from "@/hooks/api/hr/reporting-lines-schema";

export interface CircularChainRow {
  key: string;
  members: Array<{ userId: string; name: string | null }>;
}

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

  return report.circular.map((cycle) => {
    const served = new Map((cycle.members ?? []).map((member) => [member.userId, member.name]));
    return {
      key: cycle.userIds.join(">"),
      members: cycle.userIds.map((userId) => ({ userId, name: served.get(userId) ?? names.get(userId) ?? null })),
    };
  });
}
