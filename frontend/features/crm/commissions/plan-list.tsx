"use client";

import { useCallback, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { CommissionPlanSummary } from "@/types/crm/commission";
import { CommissionPlanDetailSheet } from "./commission-plan-detail-sheet";
import { CommissionPlanSheet, type CommissionPlanSheetTarget } from "./commission-plan-sheet";

interface PlanListProps {
  plans: CommissionPlanSummary[];
  locale: string;
}

/**
 * The plan catalogue. "Open" shows a plan's versions and assignments, where
 * the manage writes live.
 *
 * Retirement is shown rather than hidden: a retired plan is not assignable, but
 * earnings calculated under it keep the rules that were in force when they were
 * sealed, so a plan disappearing from this list would make a past payout
 * unexplainable.
 */
export function PlanList({ plans, locale }: PlanListProps) {
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const [versionTarget, setVersionTarget] = useState<CommissionPlanSheetTarget | null>(null);
  const handleOpen = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => setOpenPlanId(event.currentTarget.dataset.planId ?? null),
    [],
  );
  const handleDetailOpenChange = useCallback((open: boolean) => {
    if (!open) setOpenPlanId(null);
  }, []);
  const handleVersionOpenChange = useCallback((open: boolean) => {
    if (!open) setVersionTarget(null);
  }, []);

  if (plans.length === 0)
    return (
      <EmptyState
        compact
        title="No commission plans yet"
        description="A plan defines the tiers, accelerators and caps a rep is paid under, and is versioned by date so a change is never retroactive."
      />
    );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Currency</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.planId}>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{plan.name}</span>
                  {plan.description ? (
                    <span className="text-sm text-muted-foreground">
                      {plan.description}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{plan.currency}</TableCell>
              <TableCell>
                {plan.retiredOn ? (
                  <Badge
                    variant="secondary"
                    className="bg-status-neutral-surface text-status-neutral-ink"
                  >
                    {`Retired ${new Date(`${plan.retiredOn}T00:00:00Z`).toLocaleDateString(
                      locale,
                      { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" },
                    )}`}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-status-success-surface text-status-success-ink"
                  >
                    Active
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <Button variant="outline" size="sm" data-plan-id={plan.planId} onClick={handleOpen}>
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <CommissionPlanDetailSheet
        planId={openPlanId}
        locale={locale}
        onOpenChange={handleDetailOpenChange}
        onEditVersion={setVersionTarget}
      />
      <CommissionPlanSheet target={versionTarget} onOpenChange={handleVersionOpenChange} />
    </div>
  );
}
