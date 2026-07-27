"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/hooks/api/build/roadmap";
import type { ChangelogEntry } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/features/build/shared/pm-chrome";
import { ChangelogEntryCard } from "./changelog-entry-card";
import { ChangelogSheet } from "./changelog-sheet";

interface ChangelogTabProps {
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
}

function ChangelogListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "space-y-2 p-3")}>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
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

  function handleRetry() {
    void refetch();
  }

  function handleOpenSheet() {
    if (isCreateControlled) onCreateOpenChange(true);
    else setInternalCreateOpen(true);
  }

  function handleCloseSheet() {
    if (isCreateControlled) onCreateOpenChange(false);
    else setInternalCreateOpen(false);
  }

  function handleCloseEdit() {
    setEditTarget(null);
  }

  function handleDeleteDialogChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  const handleEditEntry = useCallback((entry: ChangelogEntry) => {
    setEditTarget(entry);
  }, []);

  const handleDeleteEntry = useCallback((entry: ChangelogEntry) => {
    setDeleteTarget(entry);
  }, []);

  const handleTogglePublish = useCallback(
    (entry: ChangelogEntry) => {
      update.mutate(
        { id: entry.id, isPublished: !entry.isPublished },
        {
          onSuccess: () =>
            toast.success(entry.isPublished ? "Entry unpublished" : "Entry published"),
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [update],
  );

  function handleDelete() {
    if (!deleteTarget) return;
    deleteEntry.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Changelog entry deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  if (isLoading) return <ChangelogListSkeleton />;

  if (isError) {
    return (
      <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {!data || data.length === 0 ? (
        <EmptyState
          className={PM_FILL_PANEL}
          illustration={<EmptyTicketIllustration />}
          title="No changelog entries yet"
          description="Announce shipped features, improvements and fixes to your users."
          action={{ label: "Add entry", onClick: handleOpenSheet }}
        />
      ) : (
        <PmStaggerList className="space-y-2">
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
        </PmStaggerList>
      )}

      {sheetOpen ? <ChangelogSheet onClose={handleCloseSheet} /> : null}
      {editTarget ? <ChangelogSheet entry={editTarget} onClose={handleCloseEdit} /> : null}

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
