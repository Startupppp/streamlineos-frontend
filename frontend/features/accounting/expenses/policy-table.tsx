"use client";

import { useCallback } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/features/accounting/shared";
import type { FinExpensePolicy } from "@/types/accounting/expenses";

interface PolicyTableProps {
  policies: FinExpensePolicy[];
  onEdit: (policy: FinExpensePolicy) => void;
  onDelete: (policy: FinExpensePolicy) => void;
  onToggleActive: (policy: FinExpensePolicy, isActive: boolean) => void;
  togglingId: number | null;
}

export function PolicyTable({ policies, onEdit, onDelete, onToggleActive, togglingId }: PolicyTableProps) {
  const handleEdit = useCallback(
    (policy: FinExpensePolicy) => () => onEdit(policy),
    [onEdit],
  );

  const handleDelete = useCallback(
    (policy: FinExpensePolicy) => () => onDelete(policy),
    [onDelete],
  );

  const handleToggle = useCallback(
    (policy: FinExpensePolicy) => (checked: boolean) => onToggleActive(policy, checked),
    [onToggleActive],
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                Policy name
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 hidden md:table-cell">
                Category
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right">
                Max amount
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right hidden lg:table-cell">
                Receipt above
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 text-right hidden lg:table-cell">
                Approval above
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                Active
              </TableHead>
              <TableHead className="w-16 px-2 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id} className="border-b border-border/50 hover:bg-muted/30">
                <TableCell className="px-3 py-2 text-sm font-medium">{policy.name}</TableCell>
                <TableCell className="px-3 py-2 text-sm text-muted-foreground hidden md:table-cell">
                  {policy.category?.name ?? "—"}
                </TableCell>
                <TableCell className="px-3 py-2 text-right">
                  {policy.maxAmount ? (
                    <Money value={parseFloat(policy.maxAmount)} className="text-sm" />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-right hidden lg:table-cell">
                  {policy.requiresReceiptAbove ? (
                    <Money value={parseFloat(policy.requiresReceiptAbove)} className="text-sm text-muted-foreground" />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2 text-right hidden lg:table-cell">
                  {policy.requiresApprovalAbove ? (
                    <Money value={parseFloat(policy.requiresApprovalAbove)} className="text-sm text-muted-foreground" />
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <Switch
                    checked={policy.isActive}
                    onCheckedChange={handleToggle(policy)}
                    disabled={togglingId === policy.id}
                  />
                </TableCell>
                <TableCell className="px-2 py-2">
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleEdit(policy)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={handleDelete(policy)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
