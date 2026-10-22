"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Check, Circle, CircleDot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UNSCOPED, orgScopedStorageKey, useOrgStorageScope } from "@/lib/org-scoped-storage";
import { useCan } from "@/hooks/api/access";
import { useHolidays } from "@/hooks/api/hr/holidays";
import { useLeavePolicies } from "@/hooks/api/hr/leave-policies";
import { useHrEmployeeCounts } from "@/hooks/api/hr/employee-list";
import { useManagerCoverage } from "@/hooks/api/hr/reporting-lines";
import { usePayrollPolicyCurrent } from "@/hooks/api/payroll/policies";
import { useEmployeeProfiles } from "@/hooks/api/payroll/employees";
import { usePayrollReadiness } from "@/hooks/api/payroll/readiness";
import { firstRunRows, type FirstRunRow, type FirstRunSignals } from "./first-run-steps";

const DISMISSED_KEY = "first_run_checklist_dismissed";
const dismissListeners = new Set<() => void>();
const PAID_STATUSES = new Set(["PAID", "PAYSLIPS_PUBLISHED", "CLOSED"]);

function readDismissed(scope: string): boolean {
  if (scope === UNSCOPED) return false;
  try {
    return localStorage.getItem(orgScopedStorageKey(DISMISSED_KEY, scope)) === "true";
  } catch {
    return false;
  }
}

function subscribeDismissed(callback: () => void): () => void {
  dismissListeners.add(callback);
  return () => {
    dismissListeners.delete(callback);
  };
}

function readServerDismissed(): boolean {
  return true;
}

function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Live completion for each step, or null while anything is still loading.
 * Progress comes from the org's own data, so it survives devices and reloads;
 * a disabled (no-permission) query reads as null and its step is left out.
 */
function useFirstRunSignals(): FirstRunSignals | null {
  const holidays = useHolidays();
  const leavePolicies = useLeavePolicies();
  const employees = useHrEmployeeCounts({});
  const coverage = useManagerCoverage();
  const policy = usePayrollPolicyCurrent();
  const profiles = useEmployeeProfiles({ limit: 1 });
  const readiness = usePayrollReadiness(thisMonth());
  const queries = [holidays, leavePolicies, employees, coverage, policy, profiles, readiness];
  if (queries.some((query) => query.isLoading)) return null;

  const run = readiness.data?.run;
  return {
    holidays: holidays.data ? holidays.data.length > 0 : null,
    leave: leavePolicies.data ? leavePolicies.data.length > 0 : null,
    // The founder's own account always exists; count everyone else.
    employees: employees.data ? employees.data.active + employees.data.pending - 1 > 0 : null,
    managers: coverage.data ? coverage.data.summary.withManager > 0 : null,
    template: policy.data ? Boolean(policy.data.policy) : null,
    salaries: profiles.data ? profiles.data.data.length > 0 : null,
    attendance: readiness.data ? readiness.data.inputs.status === "locked" : null,
    payroll: readiness.data ? Boolean(run && PAID_STATUSES.has(run.status)) : null,
  };
}

function StepIcon({ status }: { status: FirstRunRow["status"] }) {
  if (status === "done") return <Check className="h-4 w-4 text-status-success-ink" aria-hidden="true" />;
  if (status === "next") return <CircleDot className="h-4 w-4 text-primary" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

/** Guided first run on Home: holidays → leave → people → managers → salary → attendance → payroll. */
export function FirstRunChecklist() {
  const scope = useOrgStorageScope();
  const dismissed = useSyncExternalStore(subscribeDismissed, () => readDismissed(scope), readServerDismissed);
  const signals = useFirstRunSignals();
  const allowed = {
    holidays: useCan("hr:attendance:manage"),
    leave: useCan("hr:leaves:manage"),
    employees: useCan("hr:onboarding:manage"),
    managers: useCan("hr:reporting-lines:manage"),
    template: useCan("payroll:policies:manage"),
    salaries: useCan("payroll:salaries:update"),
    attendance: useCan("hr:payroll:lock"),
    payroll: useCan("payroll:runs:manage"),
  };

  function handleDismiss() {
    if (scope === UNSCOPED) return;
    try {
      localStorage.setItem(orgScopedStorageKey(DISMISSED_KEY, scope), "true");
    } catch {
      return;
    }
    dismissListeners.forEach((listener) => listener());
  }

  if (dismissed || !signals) return null;
  const rows = firstRunRows(signals, allowed);
  const doneCount = rows.filter((row) => row.status === "done").length;
  if (rows.length < 2 || doneCount === rows.length) return null;

  return (
    <Card aria-labelledby="first-run-title">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="first-run-title" className="text-sm font-semibold text-foreground">
              Get HR and payroll running
            </h2>
            <p className="text-xs text-muted-foreground">
              {doneCount} of {rows.length} done. Each step opens where you do it; skip any you don&apos;t need.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Hide setup checklist" onClick={handleDismiss}>
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.key} className="flex items-center gap-2 text-sm">
              <StepIcon status={row.status} />
              {row.status === "done" ? (
                <span className="text-muted-foreground line-through">{row.label}</span>
              ) : (
                <Link href={row.href} className={row.status === "next" ? "font-medium text-primary hover:underline" : "text-foreground hover:underline"}>
                  {row.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
