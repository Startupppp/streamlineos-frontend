"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { Money } from "@/features/accounting/shared";
import { BvaExplainCell } from "@/features/accounting/planning/bva-explain-column";
import { useBudgetVsActual } from "@/hooks/api/accounting/planning";
import { getErrorMessage } from "@/lib/get-error-message";
import type { BvaAccountPeriodRow } from "@/types/accounting/planning";

interface BvaFiltersProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}

function BvaFilters({ from, to, onFromChange, onToChange }: BvaFiltersProps) {
  function handleFromChange(e: ChangeEvent<HTMLInputElement>): void {
    onFromChange(e.target.value);
  }
  function handleToChange(e: ChangeEvent<HTMLInputElement>): void {
    onToChange(e.target.value);
  }
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
        <Input
          type="date"
          value={from}
          onChange={handleFromChange}
          className="text-xs w-[140px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
        <Input
          type="date"
          value={to}
          onChange={handleToChange}
          className="text-xs w-[140px]"
        />
      </div>
    </div>
  );
}

const BVA_COLUMNS: DataTableColumn<BvaAccountPeriodRow>[] = [
  {
    key: "code",
    header: "Code",
    className: "font-mono text-xs px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.accountCode,
  },
  {
    key: "account",
    header: "Account",
    className: "text-sm px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.accountName,
  },
  {
    key: "period",
    header: "Period",
    className: "text-xs text-muted-foreground px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => row.periodKey,
  },
  {
    key: "budgeted",
    header: "Budgeted",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => (
      <Money value={parseFloat(row.budgeted)} />
    ),
  },
  {
    key: "actual",
    header: "Actual",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => (
      <Money value={parseFloat(row.actual)} />
    ),
  },
  {
    key: "variance",
    header: "Variance",
    className: "text-right px-3 py-2",
    headerClassName: "text-right",
    cell: (row: BvaAccountPeriodRow): ReactNode => {
      const varianceNum = parseFloat(row.variance);
      return (
        <Money value={varianceNum} className={varianceNum > 0 ? "text-status-danger-ink" : undefined} />
      );
    },
  },
  {
    key: "status",
    header: "Status",
    className: "px-3 py-2 w-20",
    cell: (row: BvaAccountPeriodRow): ReactNode =>
      row.exceeded ? (
        <Badge variant="outline" className="bg-status-danger-surface text-status-danger-ink border-status-danger-rule text-micro px-1.5 py-0 h-4">
          Over
        </Badge>
      ) : null,
  },
  {
    key: "ai",
    header: "",
    className: "px-3 py-2",
    cell: (row: BvaAccountPeriodRow): ReactNode => <BvaExplainCell row={row} />,
  },
];

interface BvaTabProps {
  budgetId: number;
}

export function BvaTab({ budgetId }: BvaTabProps) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const query = useBudgetVsActual(budgetId, {
    from: from || undefined,
    to: to || undefined,
  });

  const rows = query.data?.rows ?? [];
  const totals = query.data?.totals;

  function handleRetry(): void {
    void query.refetch();
  }

  const tableFooter = totals ? (
    <div className="flex items-center gap-2 text-sm font-semibold">
      <span className="flex-1">Total</span>
      <Money value={parseFloat(totals.budgeted)} />
      <span className="w-4" />
      <Money value={parseFloat(totals.actual)} />
      <span className="w-4" />
      <Money
        value={parseFloat(totals.variance)}
        className={parseFloat(totals.variance) > 0 ? "text-status-danger-ink" : undefined}
      />
      <span className="w-20" />
    </div>
  ) : undefined;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <BvaFilters
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
      />
      {query.error ? (
        <ErrorState
          title="Failed to load vs-actual data"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : rows.length === 0 && !query.isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No budget vs actual data for this range.
        </p>
      ) : (
        <DataTable
          data={rows}
          columns={BVA_COLUMNS}
          getRowKey={(row) => `${row.accountId}-${row.periodKey}`}
          isLoading={query.isLoading}
          minWidth="700px"
          footer={tableFooter}
        />
      )}
    </div>
  );
}
