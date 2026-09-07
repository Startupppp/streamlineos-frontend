"use client";

import { useMemo } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import type { ProfileComponent, SalaryComponentType } from "@/hooks/api/payroll/employees-schema";

const COMPONENT_TYPE_LABELS: Record<SalaryComponentType, string> = {
  EARNING: "Earnings",
  DEDUCTION: "Deductions",
  EMPLOYER_CONTRIBUTION: "Employer Contributions",
  REIMBURSEMENT: "Reimbursements",
  TAX: "Tax",
  ADJUSTMENT: "Adjustments",
};

const COMPONENT_TYPE_ORDER: SalaryComponentType[] = [
  "EARNING",
  "DEDUCTION",
  "EMPLOYER_CONTRIBUTION",
  "REIMBURSEMENT",
  "TAX",
  "ADJUSTMENT",
];

const COMPONENT_COLUMNS: DataTableColumn<ProfileComponent>[] = [
  {
    key: "name",
    header: "Component",
    cell: (comp) => (
      <div>
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-foreground">{comp.name}</span>
          {(comp.calcMethodOverride !== null || comp.formulaOverride !== null) && (
            <span className="text-micro px-1 rounded bg-status-warning-surface text-status-warning-ink border border-status-warning-rule font-medium">
              override
            </span>
          )}
        </div>
        <span className="text-micro text-muted-foreground font-mono">{comp.code}</span>
      </div>
    ),
    className: "w-[40%] py-1 pr-2",
  },
  {
    key: "calcMethod",
    header: "Method",
    cell: (comp) => <span className="text-muted-foreground">{comp.calcMethod}</span>,
    className: "w-[20%] py-1 pr-2",
  },
  {
    key: "amount",
    header: "Amount",
    cell: (comp) => (
      <span className="font-mono tabular-nums">
        {comp.amount !== null ? formatMoney(comp.amount) : "—"}
      </span>
    ),
    className: "w-[20%] py-1 pr-2 text-right",
    headerClassName: "text-right",
  },
  {
    key: "percent",
    header: "Percent",
    cell: (comp) => (
      <span className="font-mono tabular-nums text-muted-foreground">
        {comp.percent !== null ? `${comp.percent}%` : "—"}
      </span>
    ),
    className: "w-[20%] py-1 text-right",
    headerClassName: "text-right",
  },
];

export function ComponentsBreakdown({ components }: { components: ProfileComponent[] }) {
  const grouped = useMemo(
    () =>
      COMPONENT_TYPE_ORDER.reduce<Record<SalaryComponentType, ProfileComponent[]>>(
        (acc, type) => {
          acc[type] = components.filter((c) => c.type === type);
          return acc;
        },
        { EARNING: [], DEDUCTION: [], EMPLOYER_CONTRIBUTION: [], REIMBURSEMENT: [], TAX: [], ADJUSTMENT: [] },
      ),
    [components],
  );

  if (components.length === 0) {
    return (
      <p className="text-dense text-muted-foreground">No components configured for this profile.</p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {COMPONENT_TYPE_ORDER.filter((type) => grouped[type].length > 0).map((type) => (
        <div key={type} className="pt-3 first:pt-0">
          <p className="text-micro font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
            {COMPONENT_TYPE_LABELS[type]}
          </p>
          <DataTable
            data={grouped[type]}
            columns={COMPONENT_COLUMNS}
            getRowKey={(comp) => comp.id}
            className="border-0 rounded-none text-dense"
          />
        </div>
      ))}
    </div>
  );
}
