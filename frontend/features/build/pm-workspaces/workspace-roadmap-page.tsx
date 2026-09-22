"use client";

import { useCallback, useMemo, useState } from "react";
import { useRoadmapItems, useDeleteRoadmapItem } from "@/hooks/api/build/roadmap";
import type { RoadmapItem, RoadmapStatus } from "@/types/projects";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProjectsIllustration } from "@/components/illustrations";
import { PageState } from "@/components/shared/page-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { usePageState } from "@/hooks/api/use-page-state";
import { cn } from "@/lib/utils";
import { ROADMAP_COLUMNS } from "@/features/build/roadmap/roadmap-constants";
import { RoadmapItemCard } from "@/features/build/roadmap/roadmap-item-card";
import { RoadmapItemSheet } from "@/features/build/roadmap/roadmap-item-sheet";
import {
  PmPageShell,
  PmSection,
  PmPanel,
  PmStaggerList,
  PM_FILL_PANEL,
  PM_PANEL,
  PM_TOOLBAR,
} from "@/components/pm-chrome";

interface WorkspaceRoadmapPageProps {
  pmWorkspaceId: string;
}

function RoadmapSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "min-h-[140px] space-y-2 p-2")}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function WorkspaceRoadmapPage({ pmWorkspaceId }: WorkspaceRoadmapPageProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [cursorIdx, setCursorIdx] = useState(0);
  const currentCursor = cursorHistory[cursorIdx];

  const filters = useMemo(
    () => ({
      pmWorkspaceId,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      cursor: currentCursor,
    }),
    [pmWorkspaceId, debouncedSearch, currentCursor],
  );

  const { data, isLoading, isError, error, refetch } = useRoadmapItems(filters);
  const deleteItem = useDeleteRoadmapItem();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RoadmapItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoadmapItem | null>(null);

  const grouped = useMemo(() => {
    const map: Record<string, RoadmapItem[]> = { planned: [], in_progress: [], completed: [], cancelled: [] };
    for (const item of data?.data ?? []) map[item.status]?.push(item);
    return map;
  }, [data]);

  const resolution = usePageState({
    permission: "build:roadmap:view",
    isLoading,
    isError,
    error,
    isEmpty: (data?.data ?? []).length === 0 && cursorIdx === 0,
  });
  const isDenied =
    resolution.kind === "denied" ||
    resolution.kind === "module-disabled" ||
    resolution.kind === "module-denied" ||
    resolution.kind === "plan-required";

  function handleSearchChange(value: string) {
    setSearch(value);
    setCursorHistory([undefined]);
    setCursorIdx(0);
  }

  const handleEditItem = useCallback((item: RoadmapItem) => { setEditTarget(item); }, []);
  const handleDeleteItem = useCallback((item: RoadmapItem) => { setDeleteTarget(item); }, []);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteItem.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Roadmap item deleted"); setDeleteTarget(null); },
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

  function handleRetry() { void refetch(); }
  function handleOpenCreate() { setCreateOpen(true); }
  function handleCloseCreate() { setCreateOpen(false); }
  function handleCloseEdit() { setEditTarget(null); }
  function handleDeleteDialogChange(open: boolean) { if (!open) setDeleteTarget(null); }

  const hasPrev = cursorIdx > 0;
  const hasNext = data?.pagination.hasMore ?? false;

  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Workspace roadmap items"
      actions={
        !isDenied ? (
          <Button size="sm" onClick={handleOpenCreate}>New Item</Button>
        ) : undefined
      }
      filters={
        <div className={PM_TOOLBAR}>
          <SearchInput placeholder="Search roadmap..." value={search} onValueChange={handleSearchChange} />
        </div>
      }
    >
      <PmPageShell>
        <PmSection index={0} className="flex min-h-0 flex-1 flex-col gap-4">
          <PageState
            resolution={resolution}
            loading={<RoadmapSkeleton />}
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustration={<EmptyProjectsIllustration />}
                title="No roadmap items yet"
                description="Add items to plan what this workspace is working toward."
                action={{ label: "Add roadmap item", onClick: handleOpenCreate }}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {ROADMAP_COLUMNS.map((col) => (
                  <PmPanel key={col.status} className="flex min-h-[120px] flex-col p-2">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-dense font-semibold uppercase tracking-wide text-muted-foreground">{col.label}</span>
                      <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-dense tabular-nums text-muted-foreground">
                        {(grouped[col.status as RoadmapStatus] ?? []).length}
                      </span>
                    </div>
                    {(grouped[col.status as RoadmapStatus] ?? []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">Empty</div>
                    ) : (
                      <PmStaggerList className="flex flex-col gap-1.5">
                        {(grouped[col.status as RoadmapStatus] ?? []).map((item) => (
                          <RoadmapItemCard key={item.id} item={item} onEdit={handleEditItem} onDelete={handleDeleteItem} />
                        ))}
                      </PmStaggerList>
                    )}
                  </PmPanel>
                ))}
              </div>
              {(hasPrev || hasNext) ? (
                <div className="flex items-center justify-center gap-2 border-t pt-2">
                  <Button variant="ghost" size="sm" onClick={handlePrev} disabled={!hasPrev}>Previous</Button>
                  <Button variant="ghost" size="sm" onClick={handleNext} disabled={!hasNext}>Next</Button>
                </div>
              ) : null}
            </div>
          </PageState>
        </PmSection>
      </PmPageShell>

      {createOpen ? <RoadmapItemSheet onClose={handleCloseCreate} /> : null}
      {editTarget ? <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} /> : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete roadmap item?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </PageWrapper>
  );
}
