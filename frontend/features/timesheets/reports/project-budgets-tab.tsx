"use client";

import { useCallback, useMemo, useState } from "react";
import { Pencil, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TruncatedText } from "@/components/ui/truncated-text";
import { ErrorState } from "@/components/shared/error-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCan } from "@/hooks/api/access";
import { useBudgets, useDeleteBudget } from "@/hooks/api/timesheets-core/budgets";
import type { TimesheetBudget } from "@/features/timesheets/budget-types";
import { cn } from "@/lib/utils";
import { BudgetFormDialog } from "./budget-form-dialog";
import { formatCurrencyFull } from "@/lib/format-utils";

function formatValue(budget: TimesheetBudget, value: number): string {
  if (budget.budgetType === "HOURS") return `${value.toFixed(1)}h`;
  try {
    return formatCurrencyFull(value, budget.currency);
  } catch {
    return `${budget.currency} ${value.toFixed(2)}`;
  }
}

function barColor(b: TimesheetBudget): string {
  if (b.burn.over) return "bg-status-danger-fill";
  if (b.burn.alertLevel >= 80) return "bg-status-warning-fill";
  return "bg-status-success-fill";
}

interface BudgetCardProps {
  budget: TimesheetBudget;
  canManage: boolean;
  onEdit: (b: TimesheetBudget) => void;
  onDelete: (b: TimesheetBudget) => void;
}

function BudgetCard({ budget, canManage, onEdit, onDelete }: BudgetCardProps) {
  const handleEdit = useCallback(() => onEdit(budget), [onEdit, budget]);
  const handleDelete = useCallback(() => onDelete(budget), [onDelete, budget]);
  const { burn } = budget;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <TruncatedText text={budget.projectName ?? "Unassigned"} className="text-sm font-medium text-foreground" />
            <p className="text-dense text-muted-foreground">
              {budget.budgetType === "HOURS" ? "Hours budget" : "Amount budget"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {burn.over ? (
              <Badge className="text-micro border px-1.5 py-0 bg-status-danger-surface text-status-danger-ink border-status-danger-rule">
                Over budget
              </Badge>
            ) : burn.alertLevel >= 80 ? (
              <Badge className="text-micro border px-1.5 py-0 bg-status-warning-surface text-status-warning-ink border-status-warning-rule">
                At risk
              </Badge>
            ) : (
              <Badge className="text-micro border px-1.5 py-0 bg-status-success-surface text-status-success-ink border-status-success-rule">
                On track
              </Badge>
            )}
            {canManage && (
              <>
                <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Edit budget" onClick={handleEdit}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <AnimatedIconButton
                  icon={Trash2Icon}
                  iconSize={12}
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  aria-label="Delete budget"
                  onClick={handleDelete}
                />
              </>
            )}
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", barColor(budget))}
            style={{ width: `${Math.min(100, burn.percentUsed)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-dense tabular-nums">
          <span className="text-muted-foreground">
            {formatValue(budget, burn.consumed)} of {formatValue(budget, burn.budget)}
          </span>
          <span className={cn("font-medium", burn.over ? "text-status-danger-ink" : "text-foreground")}>
            {burn.percentUsed}% · {formatValue(budget, Math.abs(burn.remaining))}{" "}
            {burn.remaining < 0 ? "over" : "left"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectBudgetsTab() {
  const canView = useCan("timesheets:budgets:view");
  const canManage = useCan("timesheets:budgets:manage");
  const { data: budgets, isLoading, isError, refetch } = useBudgets(canView);
  const deleteBudget = useDeleteBudget();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TimesheetBudget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimesheetBudget | null>(null);

  const stats = useMemo(() => {
    const list = budgets ?? [];
    const over = list.filter((b) => b.burn.over).length;
    const atRisk = list.filter((b) => !b.burn.over && b.burn.alertLevel >= 80).length;
    return { total: list.length, over, atRisk };
  }, [budgets]);

  const handleAdd = useCallback(() => {
    setEditTarget(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((b: TimesheetBudget) => {
    setEditTarget(b);
    setFormOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteBudget.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  }, [deleteTarget, deleteBudget]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  if (!canView) {
    return (
      <EmptyState
        illustrationPreset="chart"
        title="Access restricted"
        description="You don't have permission to view project budgets."
        compact
      />
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load budgets"
        description="Something went wrong while loading project budgets."
        onRetry={handleRetry}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-lg" />
        ))}
      </div>
    );
  }

  const list = budgets ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <StatCardGrid cols={3} className="flex-1">
          <StatCard label="Budgets" value={stats.total} icon={Target} tone="blue" />
          <StatCard label="At risk" value={stats.atRisk} icon={Target} tone="amber" />
          <StatCard label="Over budget" value={stats.over} icon={Target} tone="red" />
        </StatCardGrid>
        {canManage && (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
            size="sm"
            className="shrink-0"
            onClick={handleAdd}
          >
            Add budget
          </AnimatedIconButton>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          illustrationPreset="chart"
          title="No budgets yet"
          description="Set a project budget to track hours or spend against a target."
          action={canManage ? { label: "Add budget", onClick: handleAdd } : undefined}
          className="min-h-[40dvh]"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog open={formOpen} onOpenChange={setFormOpen} budget={editTarget} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the budget for {deleteTarget?.projectName ?? "this project"}. Logged time is
              not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteBudget.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
