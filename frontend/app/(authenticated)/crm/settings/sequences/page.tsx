"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { SkeletonTable } from "@/components/shared";
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
          <ErrorState title="Failed to load sequences" onRetry={handleRetry} />
        ) : isLoading ? (
          <SkeletonTable rows={5} columns={5} />
        ) : sequences.length === 0 ? (
          <EmptyState
            className="min-h-[50vh] border-0 bg-transparent"
            illustration={<AutomationsIllustration />}
            title="No sequences yet"
            description="Create your first sequence to automate multi-step outreach across leads, deals, and contacts."
            action={{ label: "New Sequence", onClick: handleOpenCreate }}
          />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Entity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sequences.map((seq) => (
                  <SequenceRow
                    key={seq.id}
                    sequence={seq}
                    onEdit={handleOpenEdit}
                    onDeleteRequest={handleDeleteRequest}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageWrapper>
    </>
  );
}

interface RowProps {
  sequence: CrmSequence;
  onEdit: (seq: CrmSequence) => void;
  onDeleteRequest: (id: string) => void;
  onToggleActive: (seq: CrmSequence) => void;
}

function SequenceRow({ sequence, onEdit, onDeleteRequest, onToggleActive }: RowProps) {
  const handleEdit = useCallback(() => onEdit(sequence), [onEdit, sequence]);
  const handleDelete = useCallback(() => onDeleteRequest(sequence.id), [onDeleteRequest, sequence.id]);
  const handleToggle = useCallback(() => onToggleActive(sequence), [onToggleActive, sequence]);

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{sequence.name}</div>
        {sequence.description && (
          <div className="text-xs text-muted-foreground truncate max-w-xs mt-0.5">
            {sequence.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="text-[11px] capitalize">
          {sequence.entityType}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Switch
          checked={sequence.isActive}
          onCheckedChange={handleToggle}
          aria-label={sequence.isActive ? "Disable sequence" : "Enable sequence"}
        />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {new Date(sequence.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
