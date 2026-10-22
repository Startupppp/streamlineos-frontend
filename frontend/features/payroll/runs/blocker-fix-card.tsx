"use client";

import Link from "next/link";
import { useState } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useRunExceptions } from "@/hooks/api/payroll/run-exceptions";
import { useRecalculateRun } from "@/hooks/api/payroll/runs";
import {
  useBuildPayrollInputPeriod,
  useCreatePayrollInputPeriod,
  useLockPayrollInputPeriod,
  usePayrollInputPeriods,
} from "@/hooks/api/payroll/payroll-inputs";
import type { RunException } from "@/hooks/api/payroll/run-exceptions-schema";
import { exceptionCodeLabel } from "@/features/payroll/readiness/readiness-categories";

const ATTENDANCE_LOCK_CODES = new Set(["MISSING_LOCKED_INPUT_PERIOD", "INPUT_NOT_FROM_LOCKED_SNAPSHOT"]);
const PROFILE_FIX_CODES = new Set([
  "MISSING_SALARY_PROFILE",
  "NO_EARNING_COMPONENTS",
  "EMPTY_COMPONENT_LIST",
  "DUPLICATE_COMPONENT_ROLE",
  "GROSS_EXCEEDS_CTC",
]);
const NAMES_SHOWN = 3;

export type BlockerGroup = { code: string; label: string; items: RunException[] };

/** Open blockers grouped by code, largest group first. */
export function groupBlockers(blockers: readonly RunException[]): BlockerGroup[] {
  const byCode = new Map<string, RunException[]>();
  for (const blocker of blockers) byCode.set(blocker.code, [...(byCode.get(blocker.code) ?? []), blocker]);
  return [...byCode.entries()]
    .map(([code, items]) => ({ code, label: exceptionCodeLabel(code), items }))
    .sort((a, b) => b.items.length - a.items.length);
}

function affectedPeople(items: readonly RunException[]): string {
  const names = [...new Set(items.map((item) => item.userName ?? item.userEmail).filter(Boolean))];
  if (names.length === 0) return "";
  const shown = names.slice(0, NAMES_SHOWN).join(", ");
  return names.length > NAMES_SHOWN ? `${shown} and ${names.length - NAMES_SHOWN} more` : shown;
}

function LockAttendanceFix({ runId, month }: { runId: number; month: string }) {
  const canLockPeriod = useCan("hr:payroll:lock");
  const canBuildPeriod = useCan("hr:payroll:generate");
  const canRecalculate = useCan("payroll:runs:manage");
  const canLock = canLockPeriod && canBuildPeriod && canRecalculate;
  const { data: periods } = usePayrollInputPeriods({ limit: 100 });
  const createPeriod = useCreatePayrollInputPeriod();
  const buildPeriod = useBuildPayrollInputPeriod();
  const lockPeriod = useLockPayrollInputPeriod();
  const recalculate = useRecalculateRun();
  const [isRunning, setIsRunning] = useState(false);

  // Create → build → lock this month's attendance, then recalculate so the
  // run picks up the locked snapshot. Each step's hook toasts its own result.
  async function handleLock() {
    setIsRunning(true);
    try {
      let period = periods?.data.find((p) => p.periodKey === month);
      if (!period) period = await createPeriod.mutateAsync({ periodKey: month });
      if (period.status === "open") period = await buildPeriod.mutateAsync(period.id);
      if (period.status !== "locked") await lockPeriod.mutateAsync(period.id);
      await recalculate.mutateAsync(runId);
    } catch {
      // The failing step already showed its error.
    } finally {
      setIsRunning(false);
    }
  }

  if (!canLock) {
    return <Link href="/payroll/inputs" className="text-xs font-medium text-primary underline-offset-2 hover:underline">Ask an admin to lock attendance</Link>;
  }
  return (
    <LoadingButton size="sm" variant="outline" onClick={handleLock} isPending={isRunning}>
      Lock attendance and update totals
    </LoadingButton>
  );
}

function BlockerFix({ group, runId, month }: { group: BlockerGroup; runId: number; month: string }) {
  if (ATTENDANCE_LOCK_CODES.has(group.code)) return <LockAttendanceFix runId={runId} month={month} />;
  const first = group.items.find((item) => item.userId);
  if (PROFILE_FIX_CODES.has(group.code) && first?.userId) {
    return (
      <Link href={`/payroll/employees/${first.userId}`} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
        Edit salary{group.items.length > 1 ? ` (1 of ${group.items.length})` : ""}
      </Link>
    );
  }
  return (
    <Link href={`/payroll/runs/${runId}?tab=exceptions`} className="text-xs font-medium text-primary underline-offset-2 hover:underline">
      Review
    </Link>
  );
}

/** "N things to fix before you can submit" — one card per blocker type, each with its fix. */
export function BlockerFixCard({ runId, month, isLocked }: { runId: number; month: string; isLocked: boolean }) {
  const { data } = useRunExceptions(runId, { severity: "BLOCKER", status: "OPEN" });
  if (isLocked || !data || data.data.length === 0) return null;
  const total = data.pagination.total;
  const groups = groupBlockers(data.data);
  const periodKey = month.slice(0, 7);

  return (
    <section aria-labelledby="blocker-fix-title" className="space-y-3 rounded-xl border border-status-danger-rule bg-status-danger-surface p-4">
      <h2 id="blocker-fix-title" className="text-sm font-semibold text-status-danger-ink">
        {total} {total === 1 ? "thing" : "things"} to fix before you can submit
      </h2>
      <ul className="space-y-2">
        {groups.map((group) => (
          <li key={group.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {group.label}
                <span className="ml-1.5 text-xs text-muted-foreground">· {group.items.length}</span>
              </p>
              <p className="truncate text-xs text-muted-foreground">{affectedPeople(group.items)}</p>
            </div>
            <BlockerFix group={group} runId={runId} month={periodKey} />
          </li>
        ))}
      </ul>
      {data.pagination.hasMore ? (
        <Link href={`/payroll/runs/${runId}?tab=exceptions`} className="text-xs text-status-danger-ink underline underline-offset-2">
          See all {total} in Exceptions
        </Link>
      ) : null}
    </section>
  );
}
