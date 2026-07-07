"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { LoadingState } from "@/components/shared/loading-state";
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
import { toast } from "sonner";
import {
  useChangelog,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "@/hooks/api/projects/roadmap";
import type { ChangelogEntry } from "@/types/projects";
import { ChangelogEntryCard } from "./changelog-entry-card";
import { ChangelogSheet } from "./changelog-sheet";

interface ChangelogTabProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

export function ChangelogTab({ createOpen, onCreateOpenChange }: ChangelogTabProps) {
  const { data, isLoading, isError, refetch } = useChangelog();
  const update = useUpdateChangelogEntry();
  const deleteEntry = useDeleteChangelogEntry();
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChangelogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  const isCreateControlled = onCreateOpenChange !== undefined;
  const sheetOpen = isCreateControlled ? (createOpen ?? false) : internalCreateOpen;

  function handleRetry() { refetch(); }
  function handleOpenSheet() {
    if (isCreateControlled) onCreateOpenChange(true);
    else setInternalCreateOpen(true);
  }
  function handleCloseSheet() {
    if (isCreateControlled) onCreateOpenChange(false);
    else setInternalCreateOpen(false);
  }
  function handleCloseEdit() { setEditTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  const handleEditEntry = useCallback((entry: ChangelogEntry) => { setEditTarget(entry); }, []);
  const handleDeleteEntry = useCallback((entry: ChangelogEntry) => { setDeleteTarget(entry); }, []);

  const handleTogglePublish = useCallback((entry: ChangelogEntry) => {
    update.mutate(
      { id: entry.id, isPublished: !entry.isPublished },
      {
        onSuccess: () => toast.success(entry.isPublished ? "Entry unpublished" : "Entry published"),
        onError: () => toast.error("Failed to update entry"),
      },
    );
  }, [update]);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Changelog entry deleted"); setDeleteTarget(null); },
      onError: () => toast.error("Failed to delete entry"),
    });
  }

  if (isLoading) return <LoadingState variant="list" rows={5} />;
  if (isError) return <ErrorState onRetry={handleRetry} />;

  return (
    <div className="space-y-4">
      {!data || data.length === 0 ? (
        <EmptyState
          illustration={<EmptyTicketIllustration />}
          title="No changelog entries yet"
          description="Announce shipped features, improvements and fixes to your users."
          action={{ label: "Add entry", onClick: handleOpenSheet }}
          className="flex-1"
        />
      ) : (
        <div className="space-y-3">
          {data.map((entry) => (
            <ChangelogEntryCard
              key={entry.id}
              entry={entry}
              isUpdating={update.isPending}
              onTogglePublish={handleTogglePublish}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />
          ))}
        </div>
      )}

      {sheetOpen && <ChangelogSheet onClose={handleCloseSheet} />}
      {editTarget && <ChangelogSheet entry={editTarget} onClose={handleCloseEdit} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete changelog entry?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
