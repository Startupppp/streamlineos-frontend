"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { CommissionPlanSheet, type CommissionPlanSheetTarget } from "./commission-plan-sheet";
import { CalculateCommissionDialog, RebuildAccrualDialog } from "./commission-run-dialogs";

interface CommissionHeaderActionsProps {
  tab: "period" | "earnings" | "plans";
}

/**
 * The page's writes, each behind its own key: defining a plan
 * (`crm:commission-plans:manage`), computing an earning — which seals a
 * version — (`crm:commission-earnings:calculate`), and rebuilding the accrual
 * breakdown (`crm:commission-accruals:rebuild`).
 */
export function CommissionHeaderActions({ tab }: CommissionHeaderActionsProps) {
  const canManagePlans = useCan("crm:commission-plans:manage");
  const canCalculate = useCan("crm:commission-earnings:calculate");
  const canRebuild = useCan("crm:commission-accruals:rebuild");
  const display = useOrgDisplay();
  const [planTarget, setPlanTarget] = useState<CommissionPlanSheetTarget | null>(null);
  const [run, setRun] = useState<"calculate" | "rebuild" | null>(null);

  const handleNewPlan = useCallback(() => setPlanTarget({ kind: "plan", currency: display.currency }), [display.currency]);
  const handlePlanOpenChange = useCallback((open: boolean) => {
    if (!open) setPlanTarget(null);
  }, []);
  const handleCalculate = useCallback(() => setRun("calculate"), []);
  const handleRebuild = useCallback(() => setRun("rebuild"), []);
  const handleRunOpenChange = useCallback((open: boolean) => {
    if (!open) setRun(null);
  }, []);

  return (
    <div className="flex items-center gap-2">
      {tab === "plans" && canManagePlans ? (
        <Button size="sm" onClick={handleNewPlan}>
          New plan
        </Button>
      ) : null}
      {tab !== "plans" && canRebuild ? (
        <Button size="sm" variant="outline" onClick={handleRebuild}>
          Rebuild accrual
        </Button>
      ) : null}
      {tab === "earnings" && canCalculate ? (
        <Button size="sm" onClick={handleCalculate}>
          Calculate for a deal
        </Button>
      ) : null}
      <CommissionPlanSheet target={planTarget} onOpenChange={handlePlanOpenChange} />
      {run === "calculate" ? <CalculateCommissionDialog onOpenChange={handleRunOpenChange} /> : null}
      {run === "rebuild" ? <RebuildAccrualDialog onOpenChange={handleRunOpenChange} /> : null}
    </div>
  );
}
