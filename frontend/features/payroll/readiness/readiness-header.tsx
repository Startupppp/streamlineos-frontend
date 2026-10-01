"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CutoffChip } from "@/components/shared/cutoff-chip";
import { ReadinessBadge } from "@/components/shared/readiness-badge";
import { formatRelativeTime } from "@/lib/date-utils";
import { hrmsSm, hrmsTransition } from "@/lib/hrms/motion";
import type { PayrollCutoff } from "@/lib/hrms/payroll-cutoff";
import type { CycleSummary } from "./readiness-summary";

interface ReadinessHeaderProps {
  summary: CycleSummary;
  cutoff: PayrollCutoff | null;
  updatedAt: number | null;
  canStartRun: boolean;
  runId: number | null;
}

interface CountProps {
  label: string;
  value: number | null;
}

function Count({ label, value }: CountProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-micro uppercase tracking-wide text-muted-foreground">{label}</span>
      {value === null ? (
        <ReadinessBadge state="unmeasured" />
      ) : (
        <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
      )}
    </div>
  );
}

export function ReadinessHeader({ summary, cutoff, updatedAt, canStartRun, runId }: ReadinessHeaderProps) {
  const reduced = useReducedMotion();
  const updated = updatedAt === null ? null : formatRelativeTime(new Date(updatedAt));

  return (
    <section
      className="rounded-xl border border-border bg-card p-4 space-y-3"
      aria-label="Cycle readiness summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <motion.div
            className="flex flex-wrap items-center gap-2"
            animate={summary.isAllClear && !reduced ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={hrmsTransition(reduced, hrmsSm)}
          >
            <ReadinessBadge state={summary.state} />
            <CutoffChip cutoff={cutoff} href="/payroll/calendar" />
          </motion.div>
          <p className="text-dense leading-snug text-muted-foreground">{summary.headline}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="min-h-11 sm:min-h-9" asChild>
            <Link href="/payroll/inputs">Open inputs</Link>
          </Button>
          {canStartRun ? (
            <Button size="sm" className="min-h-11 sm:min-h-9" asChild>
              <Link href={runId === null ? "/payroll/runs" : `/payroll/runs/${runId}`}>
                {runId === null ? "Start a run" : "Open the run"}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-4">
        <Count label="Ready" value={summary.ready} />
        <Count label="Blocked" value={summary.blockedPeople} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-micro uppercase tracking-wide text-muted-foreground">Not in cycle</span>
          <ReadinessBadge state="unmeasured" />
        </div>
        {summary.waived > 0 ? <Count label="Waived" value={summary.waived} /> : null}
      </div>
      <p className="text-micro text-muted-foreground">
        {updated === null ? "Not yet loaded" : `Updated ${updated}`}
      </p>
    </section>
  );
}
