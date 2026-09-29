"use client";

import { useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useDeleteView, useUpdateView, useViews } from "@/hooks/api/build/advanced";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { useBuildCursorPager } from "@/features/build/shared/use-build-cursor-pager";
import { PmPageShell, PmPanel, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { ViewCard, type ViewItem } from "@/features/build/views/saved-views/view-card";
import { CreateViewSheet } from "@/features/build/views/saved-views/create-view-sheet";
import { RenameViewDialog } from "@/features/build/views/saved-views/rename-view-dialog";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";

interface ProjectSettingsViewsPageProps {
  projectId: number;
}

export function ProjectSettingsViewsPage({ projectId }: ProjectSettingsViewsPageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const currentUserId = session?.user?.id;
  const canManage = useCan("build:workspace:manage");
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pager = useBuildCursorPager(listFilters.resetKey);
  const { data: viewPage, isLoading, isError, error, refetch } = useViews(projectId, {
    cursor: pager.cursor,
    search: listFilters.debouncedSearch || undefined,
  });
  const updateView = useUpdateView();
  const deleteView = useDeleteView();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ViewItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false);

  const pagedViews = viewPage?.data ?? [];
  const pagination = viewPage?.pagination;
  const { debouncedSearch } = listFilters;

  const pageState = usePageState({
    permission: "build:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && pagedViews.length === 0 && !pager.hasPrevious,
  });

  const handleNavigate = useCallback(
    (view: ViewItem) => {
      router.push(`/build/${projectId}/issues?viewId=${view.id}&view=${view.layoutType}`);
    },
    [projectId, router],
  );

  const handleTogglePin = useCallback(
    (viewId: number, isPinned: boolean) => {
      updateView.mutate({ viewId, projectId, isPinned }, { onError: (err) => toast.error(getErrorMessage(err)) });
    },
    [projectId, updateView],
  );

  const handleRename = useCallback(
    (name: string) => {
      if (!renameTarget) return;
      updateView.mutate(
        { viewId: renameTarget.id, projectId, name },
        {
          onSuccess: () => {
            setRenameTarget(null);
            toast.success("View renamed");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [projectId, renameTarget, updateView],
  );

  const handleDelete = useCallback(
    (viewId: number) => {
      deleteView.mutate({ viewId, projectId }, { onSuccess: () => toast.success("View deleted"), onError: (err) => toast.error(getErrorMessage(err)) });
    },
    [deleteView, projectId],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRefetch = useCallback(() => void refetch(), [refetch]);

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const view = pagedViews[index];
      if (view) handleNavigate(view);
    },
    [pagedViews, handleNavigate],
  );

  const handleKeyboardEdit = useCallback(
    (index: number) => {
      setRenameTarget(pagedViews[index] ?? null);
    },
    [pagedViews],
  );

  const handleKeyboardClear = useCallback(() => setRenameTarget(null), []);

  const handleToggleSelect = useCallback((viewId: number, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) next.add(viewId);
      else next.delete(viewId);
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const handleBulkDeleteConfirm = useCallback(() => {
    const count = selectedIds.size;
    for (const viewId of selectedIds) {
      deleteView.mutate({ viewId, projectId }, { onError: (err) => toast.error(getErrorMessage(err)) });
    }
    setSelectedIds(new Set());
    setConfirmBulkDeleteOpen(false);
    toast.success(`Deleted ${count} view${count !== 1 ? "s" : ""}`);
  }, [selectedIds, projectId, deleteView]);

  useBuildListKeyboard({
    itemCount: pagedViews.length,
    onOpen: handleKeyboardOpen,
    onCreate: canManage ? handleOpenCreate : undefined,
    onEdit: handleKeyboardEdit,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
    enabled: pageState.kind === "ready",
  });

  const emptyState = debouncedSearch ? (
    <EmptyState
      className={CONTENT_FILL_PANEL}
      illustrationPreset="projects"
      title="No views found"
      description={`No saved views match "${debouncedSearch}".`}
    />
  ) : (
    <EmptyState
      className={CONTENT_FILL_PANEL}
      illustrationPreset="projects"
      title="No saved views yet"
      description="Save a filtered issue layout so the team can return to the same working context."
      action={canManage ? { label: "Create view", onClick: handleOpenCreate } : undefined}
    />
  );

  return (
    <PageWrapper
      title="Saved Views"
      subtitle="Manage shared filters and layouts for project issue lists"
      actions={canManage ? <Button size="sm" onClick={handleOpenCreate}><Plus className="mr-1.5 h-4 w-4" />Create view</Button> : undefined}
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search views…",
            inputRef: searchInputRef,
          }}
          onClearAll={listFilters.activeCount > 0 ? listFilters.clearAll : undefined}
        />
      }
    >
      <PmPageShell className="overflow-hidden">
        <PageState
          resolution={pageState}
          loading={
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          }
          empty={emptyState}
          onRetry={handleRefetch}
          className="flex min-h-0 flex-1 flex-col"
        >
          <PmSection index={0} className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {selectedIds.size > 0 ? (
              <div className="mb-2 flex shrink-0 items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <span className="text-sm font-normal">{selectedIds.size} selected</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmBulkDeleteOpen(true)}
                  >
                    Delete {selectedIds.size} view{selectedIds.size !== 1 ? "s" : ""}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleClearSelection}>
                    Clear
                  </Button>
                </div>
              </div>
            ) : null}
            <PmPanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-2" solid>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {pagedViews.map((view) => (
                  <ViewCard
                    key={view.id}
                    view={view}
                    isPinned={view.isPinned}
                    currentUserId={currentUserId}
                    onNavigate={handleNavigate}
                    onTogglePin={handleTogglePin}
                    onRename={setRenameTarget}
                    onDelete={handleDelete}
                    canManage={canManage}
                    isSelected={selectedIds.has(view.id)}
                    onToggleSelect={canManage ? handleToggleSelect : undefined}
                  />
                ))}
              </div>
              {(pagination?.hasMore || pager.hasPrevious) ? (
                <TablePagination
                  mode="cursor"
                  rowCount={pagedViews.length}
                  hasMore={pagination?.hasMore ?? false}
                  hasPrevious={pager.hasPrevious}
                  onNext={() => pager.goNext(pagination?.nextCursor)}
                  onPrevious={pager.goPrevious}
                />
              ) : null}
            </PmPanel>
          </PmSection>
        </PageState>
      </PmPageShell>
      {canManage ? (
        <CreateViewSheet
          projectId={projectId}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleRefetch}
        />
      ) : null}
      {canManage ? (
        <RenameViewDialog
          open={renameTarget !== null}
          onOpenChange={(open) => { if (!open) setRenameTarget(null); }}
          currentName={renameTarget?.name ?? ""}
          onRename={handleRename}
          isSaving={updateView.isPending}
        />
      ) : null}
      <ConfirmDialog
        open={confirmBulkDeleteOpen}
        onOpenChange={setConfirmBulkDeleteOpen}
        title={`Delete ${selectedIds.size} view${selectedIds.size !== 1 ? "s" : ""}?`}
        description="These saved views will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleBulkDeleteConfirm}
      />
    </PageWrapper>
  );
}
