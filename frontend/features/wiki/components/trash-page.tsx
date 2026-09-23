"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  useKbPagesTrash,
  useRestoreKbPage,
  useHardDeleteKbPage,
  useEmptyKbTrash,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import {
  KbRotateCcwIcon,
  KbTrash2Icon,
} from "@/features/wiki/lib/kb-icons";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  WikiPageCard,
  WIKI_PAGE_CARD_GRID_CLASS,
} from "@/features/wiki/components/wiki-page-card";
import { TrashRetentionSection } from "@/features/wiki/components/trash-retention-section";

function TrashRow({ page }: { page: KbPageListItem }) {
  const restore = useRestoreKbPage();
  const hardDelete = useHardDeleteKbPage();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleRestore() {
    restore.mutate(page.id, {
      onSuccess: () => toast.success("Page restored"),
      onError: () => toast.error("Failed to restore page"),
    });
  }

  function handleDeleteForeverClick() {
    setConfirmOpen(true);
  }

  function handleConfirmDelete() {
    hardDelete.mutate(page.id, {
      onSuccess: () => toast.success("Page permanently deleted"),
      onError: () => toast.error("Failed to delete page"),
    });
  }

  function handleConfirmOpenChange(open: boolean) {
    setConfirmOpen(open);
  }

  return (
    <>
      <WikiPageCard
        title={page.title}
        icon={page.icon}
        coverImage={page.coverImage}
        subtitle={`Deleted ${page.deletedAt ? kbTimeAgo(page.deletedAt) : ""}`}
      >
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRestore}
            disabled={restore.isPending}
            className="gap-1 text-xs"
          >
            <KbRotateCcwIcon className="h-3 w-3" />
            Restore
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleDeleteForeverClick}
            disabled={hardDelete.isPending}
            className="gap-1 text-xs text-destructive hover:text-destructive"
          >
            <KbTrash2Icon className="h-3 w-3" />
            Delete forever
          </Button>
        </div>
      </WikiPageCard>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. &ldquo;{page.title || "Untitled"}
              &rdquo; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={hardDelete.isPending}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TrashSkeleton() {
  return (
    <div className={WIKI_PAGE_CARD_GRID_CLASS}>
      {Array.from({ length: 5 }).map((_, skeletonIndex) => (
        <Skeleton key={skeletonIndex} className="h-28 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function TrashPage() {
  const { data: pages = [], isLoading, isError } = useKbPagesTrash();
  const emptyTrash = useEmptyKbTrash();
  const canPurge = useCan("kb:pages:purge");
  const canManageSettings = useCan("kb:settings:manage");
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);

  function handleEmptyTrashClick() {
    setEmptyConfirmOpen(true);
  }

  function handleConfirmEmptyTrash() {
    emptyTrash.mutate(undefined, {
      onSuccess: (data) =>
        toast.success(`Emptied trash — ${data.purgedCount} page${data.purgedCount === 1 ? "" : "s"} permanently deleted`),
      onError: () => toast.error("Failed to empty trash"),
    });
  }

  function handleEmptyConfirmOpenChange(open: boolean) {
    setEmptyConfirmOpen(open);
  }

  const actions =
    canPurge && pages.length > 0 ? (
      <Button
        variant="outline"
        size="sm"
        onClick={handleEmptyTrashClick}
        disabled={emptyTrash.isPending}
        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
      >
        Empty Trash
      </Button>
    ) : undefined;

  return (
    <>
      <PageWrapper
        title="Trash"
        subtitle="Deleted pages can be restored or permanently removed"
        actions={actions}
      >
        <div className="space-y-4">
          {canManageSettings ? <TrashRetentionSection /> : null}
          {isLoading && <TrashSkeleton />}
          {!isLoading && isError && (
            <EmptyState
              illustration={
                <KbTrash2Icon className="w-8 text-muted-foreground" />
              }
              title="Could not load trash"
              description="There was a problem fetching deleted pages."
              className={CONTENT_FILL_PANEL}
            />
          )}
          {!isLoading && !isError && pages.length === 0 && (
            <EmptyState
              illustration={
                <KbTrash2Icon className="w-8 text-muted-foreground" />
              }
              title="Trash is empty"
              description="Deleted pages will appear here and can be restored or permanently removed."
              className={CONTENT_FILL_PANEL}
            />
          )}
          {!isLoading && !isError && pages.length > 0 && (
            <div className={WIKI_PAGE_CARD_GRID_CLASS}>
              {pages.map((page) => (
                <TrashRow key={page.id} page={page} />
              ))}
            </div>
          )}
        </div>
      </PageWrapper>

      <AlertDialog open={emptyConfirmOpen} onOpenChange={handleEmptyConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Empty the trash?</AlertDialogTitle>
            <AlertDialogDescription>
              All {pages.length} page{pages.length === 1 ? "" : "s"} in the trash will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmEmptyTrash}
              disabled={emptyTrash.isPending}
            >
              Empty Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
