"use client";

import { memo } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PayrollStatusBadge, formatMoney } from "@/features/payroll/shared";
import type { SalaryComponent } from "@/types/payroll/setup";
import type { DataTableColumn } from "@/components/ui/data-table";
import { ComponentTypeBadge } from "./component-type-badge";

const ValueCell = memo(function ValueCell({ row }: { row: SalaryComponent }) {
  if (row.amount) {
    return <span className="font-mono tabular-nums text-xs">{formatMoney(row.amount, "INR")}</span>;
  }
  if (row.percent) {
    return <span className="font-mono tabular-nums text-xs">{row.percent}%</span>;
  }
  if (row.formula) {
    return <span className="text-xs text-muted-foreground italic">Formula</span>;
  }
  return <span className="text-xs text-muted-foreground">—</span>;
});

export function buildComponentColumns(
  onEdit: (row: SalaryComponent) => void,
  onDelete: (row: SalaryComponent) => void,
): DataTableColumn<SalaryComponent>[] {
  return [
    {
      key: "name",
      header: "Name / Code",
      cell: (row) => (
        <div>
          <p className="text-sm font-medium">{row.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{row.code}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => <ComponentTypeBadge type={row.type} />,
    },
    {
      key: "calcMethod",
      header: "Method",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.calcMethod.replace(/_/g, " ")}</span>
      ),
    },
    {
      key: "value",
      header: "Value",
      cell: (row) => <ValueCell row={row} />,
    },
    {
      key: "flags",
      header: "Flags",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {row.taxable && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
              Tax
            </span>
          )}
          {row.showOnPayslip && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              Slip
            </span>
          )}
          {row.isStatutory && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30">
              Stat
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <PayrollStatusBadge
          variant="component"
          status={row.isActive ? "active" : "inactive"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-16",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => { e.stopPropagation(); onEdit(row); }}
            aria-label="Edit component"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <AnimatedIconButton
            icon={Trash2Icon}
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(row); }}
            aria-label="Delete component"
            disabled={row.isStatutory}
          />
        </div>
      ),
    },
  ];
}
