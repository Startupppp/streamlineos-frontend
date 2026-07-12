"use client";

import { useState } from "react";
import { Plus, Play, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import {
  useRecurringJournals,
  useDeleteRecurringJournal,
  useRunRecurringJournalNow,
} from "@/hooks/api/accounting/core";
import type { RecurringJournal, RecurringFrequency } from "@/hooks/api/accounting/core";
import { RecurringJournalSheet } from "./recurring-journal-sheet";

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  YEARLY: "Yearly",
};

function formatDate(value: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

interface RecurringRowActionsProps {
  template: RecurringJournal;
  onEdit: (template: RecurringJournal) => void;
  onDelete: (id: number) => void;
}

function RecurringRowActions({ template, onEdit, onDelete }: RecurringRowActionsProps) {
  const runNow = useRunRecurringJournalNow(template.id);

  function handleEdit(): void {
    onEdit(template);
  }

  function handleRunNow(): void {
    runNow.mutate(undefined, {
      onSuccess: () => toast.success("Journal entry created"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleDelete(): void {
    onDelete(template.id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={runNow.isPending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={handleRunNow} disabled={runNow.isPending}>
          <Play className="mr-2 h-3.5 w-3.5" />
          Run now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEdit}>
          <Pencil className="mr-2 h-3.5 w-3.5" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const COLUMNS: DataTableColumn<RecurringJournal>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.name}</p>
        {row.description && (
          <p className="text-xs text-muted-foreground truncate max-w-[280px]">
            {row.description}
          </p>
        )}
      </div>
    ),
  },
  {
    key: "frequency",
    header: "Frequency",
    headerClassName: "w-[120px]",
    className: "w-[120px]",
    cell: (row) => (
      <Badge variant="outline" className="text-xs">
        {FREQUENCY_LABELS[row.frequency]}
      </Badge>
    ),
  },
  {
    key: "nextRunDate",
    header: "Next run",
    headerClassName: "w-[140px]",
    className: "w-[140px] text-sm tabular-nums text-muted-foreground",
    cell: (row) => formatDate(row.nextRunDate),
  },
  {
    key: "status",
    header: "Status",
    headerClassName: "w-[100px]",
    className: "w-[100px]",
    cell: (row) => (
      <Badge variant={row.isActive ? "default" : "secondary"} className="text-xs">
        {row.isActive ? "Active" : "Inactive"}
      </Badge>
    ),
  },
];

export function RecurringJournalsTab() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<RecurringJournal | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const query = useRecurringJournals({ page: 1, pageSize: 100 });
  const deleteMutation = useDeleteRecurringJournal(deleteId ?? 0);

  const items = query.data?.items ?? [];

  function handleRetry(): void {
    void query.refetch();
  }

  function handleOpenCreate(): void {
    setEditTemplate(null);
    setSheetOpen(true);
  }

  function handleEdit(template: RecurringJournal): void {
    setEditTemplate(template);
    setSheetOpen(true);
  }

  function handleDeleteRequest(id: number): void {
    setDeleteId(id);
  }

  function handleDeleteCancel(): void {
    setDeleteId(null);
  }

  function handleDeleteConfirm(): void {
    if (deleteId === null) return;
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Template deleted");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteId(null);
      },
    });
  }

  function handleAlertOpenChange(open: boolean): void {
    if (!open) handleDeleteCancel();
  }

  function handleSheetOpenChange(open: boolean): void {
    setSheetOpen(open);
    if (!open) setEditTemplate(null);
  }

  const columns: DataTableColumn<RecurringJournal>[] = [
    ...COLUMNS,
    {
      key: "actions",
      header: "",
      headerClassName: "w-12",
      className: "w-12 text-right",
      cell: (row) => (
        <RecurringRowActions
          template={row}
          onEdit={handleEdit}
          onDelete={handleDeleteRequest}
        />
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      illustrationPreset="documents"
      title="No recurring templates"
      description="Create a template to auto-generate journal entries on a schedule."
      action={{ label: "New template", onClick: handleOpenCreate }}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Recurring journal templates run automatically on the configured schedule.
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New template
        </Button>
      </div>

      {query.error ? (
        <ErrorState
          title="Failed to load templates"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : (
        <DataTable
          data={items}
          columns={columns}
          getRowKey={(row) => row.id}
          isLoading={query.isLoading}
          emptyState={emptyState}
        />
      )}

      <RecurringJournalSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        mode={editTemplate ? "edit" : "create"}
        template={editTemplate}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring template?</AlertDialogTitle>
            <AlertDialogDescription>
              This template will be permanently deleted and will no longer run automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteMutation.isPending}
              onClick={handleDeleteCancel}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
