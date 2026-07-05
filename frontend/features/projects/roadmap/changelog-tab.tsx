"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ChangelogTab() {
  const { data, isLoading, isError, refetch } = useChangelog();
  const update = useUpdateChangelogEntry();
  const deleteEntry = useDeleteChangelogEntry();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChangelogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  function handleRetry() { refetch(); }
  function handleOpenSheet() { setSheetOpen(true); }
  function handleCloseSheet() { setSheetOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }
  function handleEditEntry(entry: ChangelogEntry) { setEditTarget(entry); }
  function handleDeleteEntry(entry: ChangelogEntry) { setDeleteTarget(entry); }

  function handleTogglePublish(entry: ChangelogEntry) {
    update.mutate(
      { id: entry.id, isPublished: !entry.isPublished },
      {
        onSuccess: () => toast.success(entry.isPublished ? "Entry unpublished" : "Entry published"),
        onError: () => toast.error("Failed to update entry"),
      },
    );
  }

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data?.length ?? 0} entries</p>
        <Button size="sm" onClick={handleOpenSheet}>
          <Plus className="h-4 w-4 mr-1" /> New Entry
        </Button>
      </div>

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
