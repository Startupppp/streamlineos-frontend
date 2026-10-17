"use client";

import { useMemo } from "react";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { payrollRunStartGate, type RunStartGate } from "@/features/payroll/runs/run-start-gate";
import { useCan } from "@/hooks/api/access";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { usePayrollReadiness, usePayrollRunBlockers, READINESS_PAGE_LIMIT } from "@/hooks/api/payroll/readiness";
import { useRunEmployees, useRunVariance } from "@/hooks/api/payroll/run-employees";
import { usePayrollRun } from "@/hooks/api/payroll/runs";
import { formatShortDate } from "@/lib/date-utils";
import { blockedPeopleCount, openBlockerCount, readinessBlockerRows, waivedCount } from "./readiness-blockers";
import { peopleVerdict } from "./readiness-people-row";
import { summariseCycle } from "./readiness-summary";
import { deriveCloseSteps, type CloseStepKey } from "./close-steps";

const CALCULATED = new Set(["PREVIEW_READY", "EXCEPTIONS_FOUND", "PENDING_APPROVAL", "APPROVED", "LOCKED", "PAID", "PAYSLIPS_PUBLISHED", "CLOSED"]);

function signedPercent(current: string, previous: string): string {
  const prev = parseFloat(previous);
  if (!Number.isFinite(prev) || prev === 0) return "";
  const pct = ((parseFloat(current) - prev) / prev) * 100;
  return ` (${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%)`;
}

export function useCloseMonth(month: string) {
  const readiness = usePayrollReadiness(month);
  const runId = readiness.data?.run?.id ?? null;
  const runBlockers = usePayrollRunBlockers(month, runId);
  const roster = useRunEmployees(runId ?? 0, { limit: READINESS_PAGE_LIMIT });
  const detail = usePayrollRun(runId ?? 0);
  const run = detail.data?.run ?? null;
  const runStatus = run?.status ?? readiness.data?.run?.status ?? null;
  const variance = useRunVariance(runStatus !== null && CALCULATED.has(runStatus) && runId !== null ? runId : 0);

  const canViewPolicies = useCan("payroll:policies:view");
  const policy = usePayrollPolicyCurrent();
  const gate: RunStartGate | null =
    canViewPolicies && policy.data !== undefined ? payrollRunStartGate({ policyReady: Boolean(policy.data.policy) }) : null;
  const setup = gate?.action === "setup" ? gate : null;

  const isLoading = readiness.isLoading || runBlockers.isLoading || roster.isLoading;
  const hardError = readiness.isError && readiness.data === undefined;
  const isStale = readiness.data !== undefined && (readiness.isError || runBlockers.isError || roster.isError);

  const rows = useMemo(() => readinessBlockerRows(readiness.data, runBlockers.data?.data), [readiness.data, runBlockers.data]);
  const peopleBlocked = readiness.data ? peopleVerdict(readiness.data.people).blocked : false;
  const openBlockers = openBlockerCount(rows) + (peopleBlocked ? 1 : 0);

  const summary = summariseCycle({
    isLoading,
    isStale,
    blockers: openBlockers,
    blockedPeople: blockedPeopleCount(rows),
    blockedPeopleIsComplete: runBlockers.data !== undefined && !runBlockers.data.pagination.hasMore,
    waived: waivedCount(rows),
    population: { inCycle: roster.data?.pagination.total ?? 0, isComplete: runId !== null && roster.data !== undefined },
  });

  const steps = deriveCloseSteps({ runStatus, openBlockers });

  const heldCount =
    roster.data && !roster.data.pagination.hasMore
      ? roster.data.data.filter((row) => row.holdReason !== null).length
      : null;

  const v = variance.data;
  const summaries: Partial<Record<CloseStepKey, string>> = {
    open: readiness.data?.run ? `Run created ${formatShortDate(readiness.data.run.createdAt)}` : undefined,
    checklist: summary.headline,
    process: run ? `${run.employeeCount ?? 0} employees · net ${formatMoney(run.netTotal)}` : undefined,
    compare: v
      ? v.previousRun
        ? `Net ${formatMoney(v.currentRun.netTotal)} vs ${formatMoney(v.previousRun.netTotal)}${signedPercent(v.currentRun.netTotal, v.previousRun.netTotal)}`
        : `Net ${formatMoney(v.currentRun.netTotal)} · no earlier locked run to compare`
      : undefined,
    approve: runStatus === "PENDING_APPROVAL" ? "Waiting on approvers" : "Approved and locked",
    pay: "Marked paid",
    release: `Payslips released${heldCount ? ` · ${heldCount} on hold` : ""}`,
  };

  return {
    readiness,
    runBlockers,
    roster,
    detail,
    variance,
    run,
    runId,
    runStatus,
    rows,
    openBlockers,
    summary,
    steps,
    summaries,
    heldCount,
    setup,
    isLoading,
    hardError,
    isStale,
  };
}

export type CloseMonth = ReturnType<typeof useCloseMonth>;
