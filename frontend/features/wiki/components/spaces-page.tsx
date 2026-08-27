"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
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
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { useKbSpaces, useDeleteKbSpace } from "@/hooks/api/kb/spaces";
import { useKbPagesTree } from "@/hooks/api/kb/pages";
import {
  KbLayoutGridIcon,
  KbPlusIcon,
} from "@/features/wiki/lib/kb-icons";
import type { KbSpace } from "@/types/kb";
import { SpaceCard, SpaceCardSkeleton } from "./space-card";
import { SpaceSheet } from "./space-sheet";

export default function SpacesPage() {
  const canManage = useCan("kb:spaces:manage");
  const { data: spaces = [], isLoading, isError } = useKbSpaces();
  const { data: treeNodes = [] } = useKbPagesTree();
  const pageCountBySpaceId = treeNodes.reduce<Record<number, number>>(
    (acc, n) => {
      if (n.spaceId != null) {
        acc[n.spaceId] = (acc[n.spaceId] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );
  const deleteSpace = useDeleteKbSpace();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<KbSpace | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KbSpace | null>(null);

  function handleCreate() {
    setEditingSpace(null);
    setSheetOpen(true);
  }

  function handleEdit(space: KbSpace) {
    setEditingSpace(space);
    setSheetOpen(true);
  }

  function handleDelete(space: KbSpace) {
    setDeleteTarget(space);
  }

  function handleSheetOpenChange(open: boolean) {
    setSheetOpen(open);
    if (!open) setEditingSpace(null);
  }

  function handleSheetSuccess() {
    setSheetOpen(false);
    setEditingSpace(null);
  }

  function handleDeleteAlertOpenChange(open: boolean) {
    if (!open) setDeleteTarget(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    deleteSpace.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Space deleted");
        setDeleteTarget(null);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  const subtitle = "Organize your wiki pages into spaces";

  return (
    <PageWrapper
      title="Spaces"
      subtitle={subtitle}
      actions={
        canManage ? (
          <Button size="sm" onClick={handleCreate}>
            <KbPlusIcon className="h-4 w-4 mr-1.5" />
            New space
          </Button>
        ) : undefined
      }
    >
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SpaceCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <EmptyState
          illustration={
            <KbLayoutGridIcon className="w-8 text-muted-foreground/40" />
          }
          title="Could not load spaces"
          description="There was a problem fetching spaces."
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && spaces.length === 0 && (
        <EmptyState
          illustration={
            <KbLayoutGridIcon className="w-8 text-muted-foreground/40" />
          }
          title="No spaces yet"
          description="Create a space to organize your wiki pages."
          action={
            canManage
              ? { label: "Create space", onClick: handleCreate }
              : undefined
          }
          className={CONTENT_FILL_PANEL}
        />
      )}

      {!isLoading && !isError && spaces.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spaces.map((space) => (
            <SpaceCard
              key={space.id}
              space={space}
              canManage={canManage}
              pageCount={pageCountBySpaceId[space.id] ?? 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <SpaceSheet
        open={sheetOpen}
        editingSpace={editingSpace}
        onOpenChange={handleSheetOpenChange}
        onSuccess={handleSheetSuccess}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteAlertOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete space?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={deleteSpace.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
