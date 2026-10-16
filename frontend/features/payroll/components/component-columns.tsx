"use client";

import { memo } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PayrollStatusBadge, formatMoney } from "@/features/payroll/shared";
import type { SalaryComponentListItem } from "@/hooks/api/payroll/components-schema";
import type { DataTableColumn } from "@/components/ui/data-table";
import { ComponentTypeBadge } from "./component-type-badge";
import { componentRole } from "./lib/component-role";
import { fromComponentCalc, PERCENT_BASE_BASIC, PERCENT_BASE_GROSS } from "./lib/component-form-schema";
import { TruncatedText } from "@/components/ui/truncated-text";

const ValueCell = memo(function ValueCell({ row }: { row: SalaryComponentListItem }) {
  const calc = fromComponentCalc(row);
  if ((row.calcMethod === "FIXED" || row.calcMethod === "ATTENDANCE_BASED" || row.calcMethod === "TIMESHEET_BASED") && row.amount) {
    return <span className="font-mono tabular-nums text-xs">{formatMoney(row.amount, "INR")}</span>;
  }
  if (calc.calcMethod === "PERCENT_OF" && calc.percent) {
    const base = calc.percentBase === PERCENT_BASE_BASIC ? "Basic" : calc.percentBase === PERCENT_BASE_GROSS ? "Gross" : calc.percentBase;
    return <span className="font-mono tabular-nums text-xs">{calc.percent}% of {base}</span>;
  }
  if (row.formula) {
    return <span className="text-xs text-muted-foreground italic">Formula</span>;
  }
  return <span className="text-xs text-muted-foreground">—</span>;
});

const RoleCell = memo(function RoleCell({ row, duplicates }: { row: SalaryComponentListItem; duplicates: ReadonlySet<string> }) {
  const role = componentRole(row);
  if (!role) return <span className="text-xs text-muted-foreground">—</span>;
  if (row.isActive && duplicates.has(role)) {
    return (
      <span
        className="text-micro px-1 py-0.5 rounded bg-status-warning-surface text-status-warning-ink border border-status-warning-rule"
        title={`More than one active component is a ${role} line. Payroll counts each one.`}
      >
        {role} · duplicate
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">{role}</span>;
});

export function buildComponentColumns(
  onEdit: (row: SalaryComponentListItem) => void,
  onDelete: (row: SalaryComponentListItem) => void,
  canManage: boolean,
  duplicates: ReadonlySet<string>,
): DataTableColumn<SalaryComponentListItem>[] {
  const columns: DataTableColumn<SalaryComponentListItem>[] = [
  ];

  if (canManage) {
    columns.push({
      key: "name",
      header: "Name / Code",
      cell: (row) => (
        <div className="min-w-0">
          <TruncatedText text={row.name} className="min-w-0 text-sm font-medium" />
          <TruncatedText text={row.code} className="min-w-0 text-xs text-muted-foreground font-mono" />
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => <ComponentTypeBadge type={row.type} />,
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => <RoleCell row={row} duplicates={duplicates} />,
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
            <span className="text-micro px-1 py-0.5 rounded bg-status-warning-surface text-status-warning-ink border border-status-warning-rule">
              Tax
            </span>
          )}
          {row.showOnPayslip && (
            <span className="text-micro px-1 py-0.5 rounded bg-muted text-muted-foreground border border-border">
              Slip
            </span>
          )}
          {row.isStatutory && (
            <span className="text-micro px-1 py-0.5 rounded bg-status-info-surface text-status-info-ink border border-status-info-rule">
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
    });
  }

  return columns;
}
