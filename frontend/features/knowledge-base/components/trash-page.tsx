"use client";

import { useState } from "react";
import { Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
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
import { useKbPagesTrash, useRestoreKbPage, useHardDeleteKbPage } from "@/hooks/api/kb";
import type { KbPage } from "@/hooks/api/kb/pages";

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return "recently";
}

function TrashRow({ page }: { page: KbPage }) {
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
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
        <span className="text-base shrink-0 w-5 text-center">{page.icon ?? "📄"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{page.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground">
            Deleted {page.deletedAt ? formatRelativeTime(page.deletedAt) : ""}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRestore}
            disabled={restore.isPending}
            className="h-7 text-xs gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Restore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDeleteForeverClick}
            disabled={hardDelete.isPending}
            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
            Delete forever
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete this page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. &ldquo;{page.title || "Untitled"}&rdquo; will be
              permanently removed.
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
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

export default function TrashPage() {
  const { data: pages = [], isLoading, isError } = useKbPagesTrash();

  const subtitle = pages.length > 0 ? `${pages.length} page${pages.length === 1 ? "" : "s"}` : undefined;

  return (
    <PageWrapper title="Trash" subtitle={subtitle}>
      {isLoading && <TrashSkeleton />}

      {!isLoading && isError && (
        <EmptyState
          illustrationPreset="archive"
          title="Could not load trash"
          description="There was a problem fetching deleted pages."
        />
      )}

      {!isLoading && !isError && pages.length === 0 && (
        <EmptyState
          illustrationPreset="archive"
          title="Trash is empty"
          description="Deleted pages will appear here and can be restored or permanently removed."
        />
      )}

      {!isLoading && !isError && pages.length > 0 && (
        <div className="space-y-1.5">
          {pages.map((page) => (
            <TrashRow key={page.id} page={page} />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
