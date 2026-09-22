"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyTicketIllustration } from "@/components/illustrations";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useChangelog,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "@/hooks/api/build/roadmap";
import { useCan } from "@/hooks/api/access";
import type { ChangelogEntry } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, PM_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
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
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const currentCursor = cursorHistory[cursorIdx];

  const { data, isLoading, isError, error, refetch } = useChangelog({ cursor: currentCursor });
  const update = useUpdateChangelogEntry();
  const deleteEntry = useDeleteChangelogEntry();
  const canManage = useCan("build:roadmap:manage");
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChangelogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  const isEmpty = (data?.data ?? []).length === 0 && cursorIdx === 0;

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty,
  });

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
        { entryId: entry.id, isPublished: !entry.isPublished },
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

  function handleNext() {
    const nc = data?.pagination.nextCursor;
    if (!nc) return;
    setCursorHistory((prev) => [...prev.slice(0, cursorIdx + 1), nc]);
    setCursorIdx((prev) => prev + 1);
  }

  function handlePrev() {
    if (cursorIdx === 0) return;
    setCursorIdx((prev) => prev - 1);
  }

  const hasPrev = cursorIdx > 0;
  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <PageState
          resolution={resolution}
          loading={<ChangelogListSkeleton />}
          empty={
            <EmptyState
              className={PM_FILL_PANEL}
              illustration={<EmptyTicketIllustration />}
              title="No changelog entries yet"
              description="Announce shipped features, improvements and fixes to your users."
              action={{ label: "Add entry", onClick: handleOpenSheet }}
            />
          }
          onRetry={handleRetry}
          className={PM_FILL_PANEL}
        >
          <>
            <PmStaggerList className="space-y-2">
              {(data?.data ?? []).map((entry) => (
                <ChangelogEntryCard
                  key={entry.id}
                  entry={entry}
                  isUpdating={update.isPending}
                  canManage={canManage}
                  onTogglePublish={handleTogglePublish}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                />
              ))}
            </PmStaggerList>
            {(hasPrev || hasNext) ? (
              <div className="flex items-center justify-center gap-2 border-t pt-2">
                <Button variant="ghost" size="sm" onClick={handlePrev} disabled={!hasPrev}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" onClick={handleNext} disabled={!hasNext}>
                  Next
                </Button>
              </div>
            ) : null}
          </>
        </PageState>
      </div>

      {sheetOpen ? <ChangelogSheet onClose={handleCloseSheet} /> : null}
      {editTarget ? <ChangelogSheet entry={editTarget} onClose={handleCloseEdit} /> : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete changelog entry?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </>
  );
}
