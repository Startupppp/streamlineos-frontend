"use client";

import { useState, useCallback, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import { useRates, useDeleteRate } from "@/hooks/api/timesheets-core/rates";
import { useCan } from "@/hooks/api/access";
import type { TimesheetRate } from "@/features/timesheets/types";
import { BILLING_TYPE_LABEL } from "@/features/timesheets/types";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
import { RateFormSheet } from "./rate-form-sheet";
import { formatMoney } from "@/lib/format-utils";
import { useOrgDisplay } from "@/hooks/api/org-display";

function formatEffectiveMonth(value: string): string {
  try {
    return format(parseISO(value), "MMM yyyy");
  } catch {
    return value;
  }
}

function formatEffectiveWindow(from: string | null, to: string | null): string {
  if (from && to) return `${formatEffectiveMonth(from)} → ${formatEffectiveMonth(to)}`;
  if (from) return `${formatEffectiveMonth(from)} →`;
  if (to) return `→ ${formatEffectiveMonth(to)}`;
  return "Always";
}

function ScopeBadges({ rate }: { rate: TimesheetRate }) {
  const hasScope =
    rate.projectId != null ||
    rate.userId != null ||
    rate.taskId != null ||
    rate.clientId != null;

  if (!hasScope) {
    return (
      <Badge variant="secondary" className="text-micro h-4 px-1.5 font-normal">
        Any
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {rate.projectId != null && (
        <Badge variant="outline" className="text-micro h-4 px-1.5 font-normal">
          Project
        </Badge>
      )}
      {rate.userId != null && (
        <Badge variant="outline" className="text-micro h-4 px-1.5 font-normal">
          User
        </Badge>
      )}
      {rate.taskId != null && (
        <Badge variant="outline" className="text-micro h-4 px-1.5 font-normal">
          Task
        </Badge>
      )}
      {rate.clientId != null && (
        <Badge variant="outline" className="text-micro h-4 px-1.5 font-normal">
          Client
        </Badge>
      )}
    </div>
  );
}

export function RatesTab() {
  const canManage = useCan("timesheets:rates:manage");
  const { data, isLoading, isError, refetch } = useRates();
  const deleteRate = useDeleteRate();
  const display = useOrgDisplay();

  const [addOpen, setAddOpen] = useState(false);
  const [editRate, setEditRate] = useState<TimesheetRate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const rates = useMemo(() => data?.rates ?? [], [data]);

  const handleAddOpen = useCallback(() => setAddOpen(true), []);
  const handleAddClose = useCallback((open: boolean) => setAddOpen(open), []);

  const handleEditClose = useCallback((open: boolean) => {
    if (!open) setEditRate(null);
  }, []);

  const handleEdit = useCallback((rate: TimesheetRate) => setEditRate(rate), []);

  const handleDeleteRequest = useCallback(
    (id: number) => setDeleteId(id),
    [],
  );

  const handleDeleteCancel = useCallback(() => setDeleteId(null), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteId == null) return;
    deleteRate.mutate(deleteId, { onSettled: () => setDeleteId(null) });
  }, [deleteId, deleteRate]);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const columns = useMemo<DataTableColumn<TimesheetRate>[]>(
    () => [
      {
        key: "scope",
        header: "Scope",
        cell: (row) => <ScopeBadges rate={row} />,
      },
      {
        key: "billingType",
        header: "Type",
        cell: (row) => (
          <span className="text-xs">{BILLING_TYPE_LABEL[row.billingType]}</span>
        ),
      },
      {
        key: "billRate",
        header: "Bill rate",
        cell: (row) => (
          <span className="text-xs tabular-nums">
            {row.billRate && !isNaN(parseFloat(row.billRate)) ? formatMoney(parseFloat(row.billRate), display) : "—"}
          </span>
        ),
      },
      {
        key: "costRate",
        header: "Cost rate",
        cell: (row) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {row.costRate && !isNaN(parseFloat(row.costRate)) ? formatMoney(parseFloat(row.costRate), display) : "—"}
          </span>
        ),
      },
      {
        key: "effective",
        header: "Effective",
        cell: (row) => (
          <span
            className={
              row.effectiveFrom || row.effectiveTo
                ? "text-xs whitespace-nowrap"
                : "text-xs text-muted-foreground"
            }
          >
            {formatEffectiveWindow(row.effectiveFrom, row.effectiveTo)}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        cell: (row) => <span className="text-xs tabular-nums">{row.priority}</span>,
      },
      ...(canManage
        ? [
            {
              key: "actions",
              header: "",
              className: "w-16",
              cell: (row: TimesheetRate) => (
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Edit rate"
                    onClick={() => handleEdit(row)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <AnimatedIconButton
                    icon={Trash2Icon}
                    iconSize={12}
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    aria-label="Delete rate"
                    onClick={() => handleDeleteRequest(row.id)}
                  />
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage, display, handleEdit, handleDeleteRequest],
  );

  if (isError) {
    return (
      <ErrorState
        title="Failed to load rates"
        onRetry={handleRetry}
        className="flex-1 min-h-[30dvh]"
      />
    );
  }

  const toolbar = canManage ? (
    <AnimatedIconButton
      icon={PlusIcon}
      iconSize={14}
      iconClassName="mr-1.5"
      size="sm"
      onClick={handleAddOpen}
    >
      Add rate
    </AnimatedIconButton>
  ) : undefined;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Higher priority overrides lower. Scope specificity: user &gt; project &gt; task &gt; client &gt; any.
      </p>

      <DataTable
        data={rates}
        columns={columns}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        toolbar={toolbar}
        emptyState={
          <EmptyState
            title="No rates yet"
            description="Add a bill rate to enable billing on timesheet entries."
            compact
            action={
              canManage ? { label: "Add rate", onClick: handleAddOpen } : undefined
            }
          />
        }
      />

      <RateFormSheet open={addOpen} onOpenChange={handleAddClose} />

      {editRate && (
        <RateFormSheet
          open
          onOpenChange={handleEditClose}
          rate={editRate}
        />
      )}

      <AlertDialog open={deleteId != null} onOpenChange={handleDeleteCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Remove rate?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This rate will be permanently deleted and will no longer apply to
              timesheet entries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
