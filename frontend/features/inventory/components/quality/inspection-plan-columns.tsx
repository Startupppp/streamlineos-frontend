"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { describeSampling } from "@/hooks/api/inventory/inspection-plans";
import type { InspectionPlan } from "@/hooks/api/inventory/inspection-plans";
import { InspectionPlanRowActions } from "./inspection-plan-row-actions";

/**
 * The plans table, with the row menu appended only for somebody who may use it.
 *
 * `canManage` is `inventory:quality:plans:manage`, the key the backend puts on
 * `PATCH` and `DELETE` alike — a reader gets the same table without a column
 * whose every entry would fail closed.
 */
export function buildInspectionPlanColumns(canManage: boolean): DataTableColumn<InspectionPlan>[] {
  const columns: DataTableColumn<InspectionPlan>[] = [
    {
      key: "plan",
      header: "Plan",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="truncate font-mono text-dense text-muted-foreground">{row.code}</p>
        </div>
      ),
    },
    {
      key: "scope",
      header: "Applies to",
      cell: (row) => <span className="text-sm">{row.scopeLabel ?? "All products"}</span>,
    },
    {
      key: "trigger",
      header: "Trigger",
      cell: (row) => <span className="text-sm text-muted-foreground">{describeTrigger(row)}</span>,
    },
    {
      key: "sampling",
      header: "Sampling",
      cell: (row) =>
        row.activeVersion ? (
          <span className="text-sm">
            {describeSampling(row.activeVersion.samplingMethod, row.activeVersion.sampleValue)}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">No published version</span>
        ),
    },
    {
      key: "version",
      header: "Version",
      headerClassName: "w-[90px]",
      className: "font-mono tabular-nums text-dense",
      cell: (row) => (row.activeVersion ? `v${row.activeVersion.version}` : "—"),
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[100px]",
      cell: (row) => <PlanStatusBadge isActive={row.isActive} />,
    },
    {
      key: "updatedAt",
      header: "Updated",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground tabular-nums",
      cell: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
    },
  ];

  if (canManage)
    columns.push({
      key: "actions",
      header: "",
      headerClassName: "w-8",
      cell: (row) => <InspectionPlanRowActions plan={row} />,
    });

  return columns;
}

function PlanStatusBadge({ isActive }: { isActive: boolean }) {
  const tone = statusToneClasses(isActive ? "success" : "neutral");
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-2 py-0.5 text-micro", tone.surface, tone.ink, tone.rule)}
    >
      {isActive ? "Active" : "Paused"}
    </Badge>
  );
}

function describeTrigger(plan: InspectionPlan): string {
  if (plan.appliesOnReceipt && plan.appliesOnReturn) return "Receipt and return";
  if (plan.appliesOnReceipt) return "Receipt";
  return "Return";
}
