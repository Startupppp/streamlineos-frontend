"use client";

import { Pencil } from "lucide-react";
import { TrashIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Switch } from "@/components/ui/switch";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Money } from "@/features/accounting/shared";
import type { FinExpensePolicy } from "@/types/accounting/expenses";

function EditPolicyButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="w-7" onClick={onClick}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

function DeletePolicyButton({ onClick }: { onClick: () => void }) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button variant="ghost" size="icon" className="w-7 text-destructive hover:text-destructive" onClick={onClick} {...hoverHandlers}>
      <TrashIcon ref={iconRef} size={14} />
    </Button>
  );
}

interface PolicyTableProps {
  policies: FinExpensePolicy[];
  onEdit: (policy: FinExpensePolicy) => void;
  onDelete: (policy: FinExpensePolicy) => void;
  onToggleActive: (policy: FinExpensePolicy, isActive: boolean) => void;
  togglingId: number | null;
  className?: string;
}

export function PolicyTable({ policies, onEdit, onDelete, onToggleActive, togglingId, className }: PolicyTableProps) {
  function getPolicyRowKey(policy: FinExpensePolicy): number {
    return policy.id;
  }

  const columns: DataTableColumn<FinExpensePolicy>[] = [
    {
      key: "name",
      header: "Policy name",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
    },
    {
      key: "category",
      header: "Category",
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">{row.category?.name ?? "—"}</span>
      ),
    },
    {
      key: "maxAmount",
      header: "Max amount",
      cell: (row) =>
        row.maxAmount ? (
          <Money value={parseFloat(row.maxAmount)} className="text-sm" />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "requiresReceiptAbove",
      header: "Receipt above",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (row) =>
        row.requiresReceiptAbove ? (
          <Money value={parseFloat(row.requiresReceiptAbove)} className="text-sm text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "requiresApprovalAbove",
      header: "Approval above",
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (row) =>
        row.requiresApprovalAbove ? (
          <Money value={parseFloat(row.requiresApprovalAbove)} className="text-sm text-muted-foreground" />
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "isActive",
      header: "Active",
      cell: (row) => (
        <Switch
          checked={row.isActive}
          onCheckedChange={(checked) => onToggleActive(row, checked)}
          disabled={togglingId === row.id}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="w-7" onClick={() => onEdit(row)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(row)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      className={className}
      data={policies}
      columns={columns}
      getRowKey={getPolicyRowKey}
      minWidth="640px"
    />
  );
}
