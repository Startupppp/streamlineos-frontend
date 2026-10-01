"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CutoffChip } from "@/components/shared/cutoff-chip";
import { usePayrollCutoff } from "@/hooks/api/payroll/payroll-cutoff";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { TeamApprovalsList } from "./team-approvals-list";
import type { ManagerHomeApproval } from "@/hooks/api/hr/manager-home-schema";

const VISIBLE_DECISIONS = 3;

interface PendingDecisionsStripProps {
  pendingTotal: number;
  items: ManagerHomeApproval[];
  unsettledTimesheets: number;
}

export function PendingDecisionsStrip({
  pendingTotal,
  items,
  unsettledTimesheets,
}: PendingDecisionsStripProps) {
  const { cutoff } = usePayrollCutoff();
  const tone = statusToneClasses(pendingTotal > 0 ? "warning" : "neutral");
  const shown = items.slice(0, VISIBLE_DECISIONS);
  const hidden = items.length - shown.length;

  return (
    <section
      data-testid="pending-decisions-strip"
      aria-label="Pending decisions"
      className="max-md:sticky max-md:top-0 max-md:z-20 rounded-2xl border border-border bg-background p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-7 items-center rounded-full border px-2.5 text-micro font-semibold tabular-nums",
            tone.surface,
            tone.inkStrong,
            tone.rule,
          )}
        >
          {pendingTotal} awaiting my decision
        </span>
        {cutoff ? <CutoffChip cutoff={cutoff} /> : null}
        <Button size="sm" variant="outline" className="ml-auto min-h-11 gap-1.5 sm:min-h-8" asChild>
          <Link href="/hr/approvals">
            Open Action Center
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>

      {cutoff && unsettledTimesheets > 0 ? (
        <p className="mt-2 text-dense text-muted-foreground">
          {unsettledTimesheets} unsettled {unsettledTimesheets === 1 ? "timesheet" : "timesheets"} on your
          team may affect this payroll cycle.
        </p>
      ) : null}

      <div className="mt-3">
        <TeamApprovalsList items={shown} allowQuickApprove />
      </div>

      {hidden > 0 ? (
        <Link href="/hr/approvals" className="mt-2 inline-block text-dense font-medium text-primary">
          {hidden} more in the Action Center
        </Link>
      ) : null}
    </section>
  );
}
