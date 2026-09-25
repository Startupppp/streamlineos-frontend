"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { useCan, useCanState } from "@/hooks/api/access";
import { useViews, useUpdateView, useDeleteView } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { currentSearchParams } from "@/lib/current-search-params";
import { fromSavedViewLayout } from "@/lib/build/view-types";
import { buildTicketCollectionReturnHref } from "@/features/build/ticket-details/build-ticket-detail-url";
import { ViewCard, type ViewItem } from "./saved-views/view-card";
import { RenameViewDialog } from "./saved-views/rename-view-dialog";
import { CreateViewSheet } from "./saved-views/create-view-sheet";

interface SavedViewsMenuProps {
  projectId: number;
}

export function SavedViewsMenu({ projectId }: SavedViewsMenuProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const viewAccess = useCanState("build:view");
  const canManage = useCan("build:workspace:manage");

  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameSeq, setRenameSeq] = useState(0);
  const [renameTarget, setRenameTarget] = useState<ViewItem | null>(null);

  const { data: views, isLoading } = useViews(projectId);
  const togglePinMutation = useUpdateView();
  const renameMutation = useUpdateView();
  const deleteMutation = useDeleteView();

  const handleNavigateToView = useCallback(
    (view: { id: number; layoutType: string }) => {
      const next = currentSearchParams(searchParams);
      next.set("viewId", String(view.id));
      next.set("view", fromSavedViewLayout(view.layoutType));
      router.replace(
        buildTicketCollectionReturnHref(
          projectId,
          `/build/${projectId}/issues`,
          next,
        ),
        { scroll: false },
      );
      setMenuOpen(false);
    },
    [projectId, router, searchParams],
  );

  const handleTogglePin = useCallback(
    (viewId: number, isPinned: boolean) => {
      togglePinMutation.mutate(
        { viewId, projectId, isPinned },
        { onError: (err) => toast.error(getErrorMessage(err)) },
      );
    },
    [togglePinMutation, projectId],
  );

  const handleOpenRename = useCallback((view: ViewItem) => {
    setRenameTarget(view);
    setRenameSeq((seq) => seq + 1);
    setRenameOpen(true);
  }, []);

  const handleRename = useCallback(
    (name: string) => {
      if (!renameTarget) return;
      renameMutation.mutate(
        { viewId: renameTarget.id, projectId, name },
        {
          onSuccess: () => {
            toast.success("View renamed");
            setRenameOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [renameMutation, projectId, renameTarget],
  );

  const handleDelete = useCallback(
    (viewId: number) => {
      deleteMutation.mutate(
        { viewId, projectId },
        {
          onSuccess: () => toast.success("View deleted"),
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [deleteMutation, projectId],
  );

  const handleOpenCreate = useCallback(() => {
    setMenuOpen(false);
    setCreateOpen(true);
  }, []);

  const handleCreated = useCallback(() => {}, []);

  const pinnedViews = (views ?? []).filter((v) => v.isPinned);
  const unpinnedViews = (views ?? []).filter((v) => !v.isPinned);

  if (viewAccess === "denied") return null;

  return (
    <>
      <ResponsivePopover open={menuOpen} onOpenChange={setMenuOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1 px-2 text-xs"
            aria-label="Saved views"
          >
            Views
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent
          align="start"
          className="w-[min(22rem,calc(100vw-2rem))] p-2"
          title="Saved views"
        >
          {isLoading ? (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : !views?.length ? (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              No saved views yet. Filter the board, then save it as a view.
            </p>
          ) : (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {pinnedViews.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <h3 className="px-1 pb-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned
                  </h3>
                  {pinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned
                      currentUserId={currentUserId}
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onRename={handleOpenRename}
                      onDelete={handleDelete}
                      canManage={canManage}
                    />
                  ))}
                </div>
              ) : null}
              {unpinnedViews.length > 0 ? (
                <div className="flex flex-col gap-0.5">
                  {pinnedViews.length > 0 ? (
                    <h3 className="px-1 pb-1 text-micro font-semibold uppercase tracking-wider text-muted-foreground">
                      All views
                    </h3>
                  ) : null}
                  {unpinnedViews.map((view) => (
                    <ViewCard
                      key={view.id}
                      view={view}
                      isPinned={false}
                      currentUserId={currentUserId}
                      onNavigate={handleNavigateToView}
                      onTogglePin={handleTogglePin}
                      onRename={handleOpenRename}
                      onDelete={handleDelete}
                      canManage={canManage}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {canManage ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleOpenCreate}
              className="mt-1 h-8 w-full justify-start gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              New view
            </Button>
          ) : null}
        </ResponsivePopoverContent>
      </ResponsivePopover>

      {canManage ? (
        <CreateViewSheet
          projectId={projectId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      ) : null}

      {canManage ? (
        <RenameViewDialog
          key={renameSeq}
          open={renameOpen}
          onOpenChange={setRenameOpen}
          currentName={renameTarget?.name ?? ""}
          onRename={handleRename}
          isSaving={renameMutation.isPending}
        />
      ) : null}
    </>
  );
}
