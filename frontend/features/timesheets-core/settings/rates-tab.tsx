"use client";

import { useState, useCallback, useMemo } from "react";
import { Pencil } from "lucide-react";
import { useRates, useDeleteRate } from "@/hooks/api/timesheets-core/rates";
import { useCan } from "@/hooks/api/access";
import type { TimesheetRate } from "@/features/timesheets-core/types";
import { BILLING_TYPE_LABEL } from "@/features/timesheets-core/types";
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

function formatCurrency(value: string | null, currency = "INR"): string {
  if (!value) return "—";
  const num = parseFloat(value);
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
  }).format(num);
}

function ScopeBadges({ rate }: { rate: TimesheetRate }) {
  const hasScope =
    rate.projectId != null ||
    rate.userId != null ||
    rate.taskId != null ||
    rate.clientId != null;

  if (!hasScope) {
    return (
      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
        Any
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {rate.projectId != null && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
          Project
        </Badge>
      )}
      {rate.userId != null && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
          User
        </Badge>
      )}
      {rate.taskId != null && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
          Task
        </Badge>
      )}
      {rate.clientId != null && (
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
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
            {formatCurrency(row.billRate, row.currency)}
          </span>
        ),
      },
      {
        key: "costRate",
        header: "Cost rate",
        cell: (row) => (
          <span className="text-xs tabular-nums text-muted-foreground">
            {formatCurrency(row.costRate, row.currency)}
          </span>
        ),
      },
      {
        key: "priority",
        header: "Priority",
        sortable: true,
        sortValue: (row) => row.priority,
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
                    onClick={() => handleDeleteRequest(row.id)}
                  />
                </div>
              ),
            },
          ]
        : []),
    ],
    [canManage, handleEdit, handleDeleteRequest],
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
