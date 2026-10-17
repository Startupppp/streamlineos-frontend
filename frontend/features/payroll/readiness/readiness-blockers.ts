import type { PayrollReadiness, RunBlocker } from "@/hooks/api/payroll/readiness-schema";
import { categoryKeyForCode, readinessCategory, type ReadinessCategoryKey } from "./readiness-categories";

export type BlockerSeverity = "blocker" | "warning" | "info";

export interface ReadinessBlockerRow {
  readonly id: string;
  readonly person: string | null;
  readonly categoryKey: ReadinessCategoryKey | null;
  readonly categoryLabel: string;
  readonly code: string;
  readonly reason: string;
  readonly severity: BlockerSeverity;
  readonly since: string | null;
  readonly owner: string;
  readonly waivedReason: string | null;
  readonly isWaived: boolean;
  readonly fix: { readonly label: string; readonly href: string } | null;
}

const UNCATEGORISED_LABEL = "Uncategorised";
const RUN_BLOCKER_OWNER = "Payroll administrator";

function labelFor(key: ReadinessCategoryKey | null): string {
  return key === null ? UNCATEGORISED_LABEL : readinessCategory(key).label;
}

function toSeverity(severity: RunBlocker["severity"]): BlockerSeverity {
  if (severity === "BLOCKER") return "blocker";
  if (severity === "WARNING") return "warning";
  return "info";
}

function readinessRows(data: PayrollReadiness): ReadinessBlockerRow[] {
  return data.exceptions.map((exception, index) => {
    const categoryKey = categoryKeyForCode(exception.code);
    return {
      id: `readiness-${exception.code}-${exception.period?.periodId ?? index}`,
      person: exception.period?.userName ?? null,
      categoryKey,
      categoryLabel: labelFor(categoryKey),
      code: exception.code,
      reason: exception.message,
      severity: exception.severity,
      since: exception.period?.changedAt ?? null,
      owner: exception.owner.label,
      waivedReason: null,
      isWaived: false,
      fix: exception.action,
    };
  });
}

function runRows(blockers: readonly RunBlocker[], runId: number): ReadinessBlockerRow[] {
  const href = `/payroll/runs/${runId}?tab=exceptions`;
  return blockers.map((blocker) => {
    const categoryKey = categoryKeyForCode(blocker.code);
    const isWaived = blocker.status === "OVERRIDDEN";
    return {
      id: `run-${blocker.id}`,
      person: blocker.userName,
      categoryKey,
      categoryLabel: labelFor(categoryKey),
      code: blocker.code,
      reason: blocker.message,
      severity: toSeverity(blocker.severity),
      since: blocker.createdAt,
      owner: RUN_BLOCKER_OWNER,
      waivedReason: isWaived ? blocker.overrideReason : null,
      isWaived,
      fix: { label: "Fix", href },
    };
  });
}

export function readinessBlockerRows(
  data: PayrollReadiness | undefined,
  runBlockers: readonly RunBlocker[] | undefined,
): ReadinessBlockerRow[] {
  if (data === undefined) return [];
  const runId = data.run?.id ?? null;
  const fromRun =
    runId === null || runBlockers === undefined
      ? []
      : runRows(
          runBlockers.filter((blocker) => blocker.status !== "RESOLVED"),
          runId,
        );
  return [...readinessRows(data), ...fromRun];
}

export function countsByCategory(
  rows: readonly ReadinessBlockerRow[],
): Readonly<Partial<Record<ReadinessCategoryKey, number>>> {
  const counts: Partial<Record<ReadinessCategoryKey, number>> = {};
  for (const row of rows) {
    if (row.categoryKey === null || row.isWaived) continue;
    counts[row.categoryKey] = (counts[row.categoryKey] ?? 0) + 1;
  }
  return counts;
}

export function openBlockerCount(rows: readonly ReadinessBlockerRow[]): number {
  return rows.filter((row) => row.severity === "blocker" && !row.isWaived).length;
}

export function waivedCount(rows: readonly ReadinessBlockerRow[]): number {
  return rows.filter((row) => row.isWaived).length;
}

export function blockedPeopleCount(rows: readonly ReadinessBlockerRow[]): number {
  const named = new Set<string>();
  for (const row of rows) {
    if (row.severity !== "blocker" || row.isWaived || row.person === null) continue;
    named.add(row.person);
  }
  return named.size;
}
