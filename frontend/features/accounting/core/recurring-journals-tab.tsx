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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
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

      {query.isLoading ? (
        <LoadingState variant="table" rows={4} />
      ) : query.error ? (
        <ErrorState
          title="Failed to load templates"
          description={query.error.message}
          onRetry={handleRetry}
        />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 py-10 px-6 text-center">
          <h3 className="text-sm font-semibold text-foreground">No recurring templates</h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Create a template to auto-generate journal entries on a schedule.
          </p>
          <Button size="sm" className="mt-4" onClick={handleOpenCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New template
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">
                  Name
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[120px]">
                  Frequency
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[140px]">
                  Next run
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 w-[100px]">
                  Status
                </TableHead>
                <TableHead className="w-12 px-3 py-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((template: RecurringJournal) => (
                <TableRow
                  key={template.id}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <TableCell className="px-3 py-2">
                    <p className="text-sm font-medium text-foreground">{template.name}</p>
                    {template.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                        {template.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Badge variant="outline" className="text-xs">
                      {FREQUENCY_LABELS[template.frequency]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-sm tabular-nums text-muted-foreground">
                    {formatDate(template.nextRunDate)}
                  </TableCell>
                  <TableCell className="px-3 py-2">
                    <Badge
                      variant={template.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 py-2 text-right">
                    <RecurringRowActions
                      template={template}
                      onEdit={handleEdit}
                      onDelete={handleDeleteRequest}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
