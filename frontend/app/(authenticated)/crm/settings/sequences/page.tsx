"use client";

import { useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { AutomationsIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCrmSequences, useDeleteCrmSequence, useUpdateCrmSequence } from "@/hooks/api/crm";
import { SequenceSheet } from "@/features/crm/settings/sequences/sequence-sheet";
import type { CrmSequence } from "@/types/crm";

export default function SequencesPage() {
  const { data, isLoading, isError, refetch } = useCrmSequences();
  const deleteSequence = useDeleteCrmSequence();
  const updateSequence = useUpdateCrmSequence();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CrmSequence | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const sequences = data?.sequences ?? [];

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((seq: CrmSequence) => {
    setEditTarget(seq);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleToggleActive = useCallback(
    (seq: CrmSequence) => {
      updateSequence.mutate(
        { id: seq.id, isActive: !seq.isActive },
        {
          onSuccess: () => toast.success(seq.isActive ? "Sequence disabled" : "Sequence enabled"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [updateSequence],
  );

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTargetId) return;
    deleteSequence.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Sequence deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTargetId(null);
      },
    });
  }, [deleteSequence, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTargetId(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const columns = useMemo<DataTableColumn<CrmSequence>[]>(() => [
    {
      key: "name",
      header: "Name",
      cell: (seq) => (
        <div>
          <div className="font-medium text-foreground">{seq.name}</div>
          {seq.description && (
            <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
              {seq.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "entityType",
      header: "Entity",
      cell: (seq) => (
        <Badge variant="outline" className="text-[11px] capitalize">
          {seq.entityType}
        </Badge>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (seq) => (
        <Switch
          checked={seq.isActive}
          onCheckedChange={() => handleToggleActive(seq)}
          aria-label={seq.isActive ? "Disable sequence" : "Enable sequence"}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortValue: (seq) => new Date(seq.createdAt).getTime(),
      cell: (seq) => (
        <span className="text-xs text-muted-foreground">
          {new Date(seq.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (seq) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenEdit(seq)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => handleDeleteRequest(seq.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
      headerClassName: "w-20",
    },
  ], [handleToggleActive, handleOpenEdit, handleDeleteRequest]);

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              This sequence will be permanently deleted and any active enrollments will be stopped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deleteSequence.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SequenceSheet
        sequence={editTarget}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
      />

      <PageWrapper
        title="Sequences"
        subtitle="Automated multi-step outreach sequences for leads, deals, and contacts"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Sequence
          </Button>
        }
      >
        {isError ? (
          <ErrorState title="Failed to load sequences" onRetry={handleRetry} className="flex-1" />
        ) : isLoading ? (
          <DataTableSkeleton rows={5} columns={5} className="flex-1" />
        ) : (
          <DataTable
            data={sequences}
            columns={columns}
            getRowKey={(seq) => seq.id}
            isLoading={false}
            className="flex-1 min-h-0"
            emptyState={
              <EmptyState
                className="flex-1 border-0 bg-transparent"
                illustration={<AutomationsIllustration />}
                title="No sequences yet"
                description="Create your first sequence to automate multi-step outreach across leads, deals, and contacts."
                action={{ label: "New Sequence", onClick: handleOpenCreate }}
              />
            }
          />
        )}
      </PageWrapper>
    </>
  );
}
