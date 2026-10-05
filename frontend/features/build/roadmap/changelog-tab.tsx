"use client";

import { useState, useCallback } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, useCursorPager } from "@/components/ui/table-pagination";
import { toast } from "sonner";
import {
  useChangelog,
  useUpdateChangelogEntry,
  useDeleteChangelogEntry,
} from "@/hooks/api/build/changelog";
import { useCan } from "@/hooks/api/access";
import type { ChangelogEntry } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { PmStaggerList, CONTENT_FILL_PANEL, PM_PANEL } from "@/components/pm-chrome";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { ChangelogEntryCard } from "./changelog-entry-card";
import { ChangelogSheet } from "./changelog-sheet";

interface ChangelogTabProps {
  cursor?: string | null;
  onCursorChange?: (cursor: string | null) => void;
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

export function ChangelogTab({
  cursor = null,
  onCursorChange = () => {},
  createOpen,
  onCreateOpenChange,
}: ChangelogTabProps) {
  const pager = useCursorPager(undefined, {
    initialCursor: cursor ?? undefined,
    onCursorChange: (nextCursor) => onCursorChange(nextCursor ?? null),
  });

  const { data, isLoading, isError, error, refetch } = useChangelog({
    cursor: pager.cursor,
  });
  const update = useUpdateChangelogEntry();
  const deleteEntry = useDeleteChangelogEntry();
  const canManage = useCan("build:roadmap:manage");
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ChangelogEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  const isEmpty = (data?.data ?? []).length === 0 && !pager.hasPrevious;

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

  const handleNext = useCallback(() => {
    pager.goNext(data?.pagination.nextCursor);
  }, [data?.pagination.nextCursor, pager]);

  const handlePrev = useCallback(() => {
    pager.goPrevious();
  }, [pager]);

  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <PageState
          resolution={resolution}
          loading={<ChangelogListSkeleton />}
          empty={
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="ticket"
              title="No changelog entries yet"
              description="Announce shipped features, improvements and fixes to your users."
              action={{ label: "Add entry", onClick: handleOpenSheet }}
            />
          }
          onRetry={handleRetry}
          className={CONTENT_FILL_PANEL}
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
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
          </div>
        </PageState>
        {(data?.data ?? []).length > 0 || pager.hasPrevious ? (
          <TablePagination
            mode="cursor"
            rowCount={(data?.data ?? []).length}
            pageNumber={pager.pageNumber}
            hasMore={hasNext}
            hasPrevious={pager.hasPrevious}
            onNext={handleNext}
            onPrevious={handlePrev}
          />
        ) : null}
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
