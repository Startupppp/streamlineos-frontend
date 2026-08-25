"use client";

import * as React from "react";
import { VarianceExplainPanel } from "@/features/accounting/ai";
import type { BvaAccountPeriodRow } from "@/types/accounting/planning";

interface BvaExplainCellProps {
  row: BvaAccountPeriodRow;
}

export function BvaExplainCell({ row }: BvaExplainCellProps) {
  const [open, setOpen] = React.useState(false);

  function handleToggle() {
    setOpen((v) => !v);
  }

  return (
    <div className="flex flex-col gap-2 min-w-[120px]">
      <button
        type="button"
        onClick={handleToggle}
        className="text-dense text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors text-left"
      >
        {open ? "Hide" : "Explain"}
      </button>
      {open && (
        <VarianceExplainPanel
          variance={{
            periodLabel: row.periodKey,
            accountName: row.accountName,
            accountCode: row.accountCode,
            budgetAmount: parseFloat(row.budgeted),
            actualAmount: parseFloat(row.actual),
            varianceAmount: parseFloat(row.variance),
            variancePct: parseFloat(row.variancePct),
          }}
        />
      )}
    </div>
  );
}
