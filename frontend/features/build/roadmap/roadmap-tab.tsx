"use client";

import { WifiOff } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination } from "@/components/ui/table-pagination";
import { BuildPaginatedContent } from "@/features/build/shared/build-paginated-content";
import { cn } from "@/lib/utils";
import {
  PmPanel,
  PmStaggerList,
  CONTENT_FILL_PANEL,
  PM_PANEL,
} from "@/components/pm-chrome";
import { PageState } from "@/components/shared/page-state";
import { ROADMAP_COLUMNS } from "./roadmap-constants";
import { RoadmapItemCard, type ScorableRoadmapItem } from "./roadmap-item-card";
import { RoadmapItemSheet } from "./roadmap-item-sheet";
import { useRoadmapTab } from "./use-roadmap-tab";

interface RoadmapTabProps {
  search: string;
  cursor?: string | null;
  onCursorChange?: (cursor: string | null) => void;
  createOpen?: boolean;
  onCreateOpenChange?: (open: boolean) => void;
  status?: string;
  managedProductId?: number;
  sort?: string;
  projectId?: number;
  horizon?: string;
  ownerId?: number;
  onClearFilters?: () => void;
  onItemsChange?: (items: ScorableRoadmapItem[]) => void;
  externalEditTarget?: ScorableRoadmapItem | null;
  onExternalEditClose?: () => void;
}

function RoadmapBoardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={cn(PM_PANEL, "min-h-[140px] space-y-2 p-2")}>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function RoadmapTab({
  search,
  cursor = null,
  onCursorChange = () => {},
  createOpen,
  onCreateOpenChange,
  status,
  managedProductId,
  sort,
  projectId,
  horizon,
  ownerId,
  onClearFilters,
  onItemsChange,
  externalEditTarget,
  onExternalEditClose,
}: RoadmapTabProps) {
  const {
    isOnline,
    resolution,
    grouped,
    data,
    sheetOpen,
    editTarget,
    deleteTarget,
    pager,
    hasNext,
    isFiltered,
    handleRetry,
    handleOpenSheet,
    handleCloseSheet,
    handleCloseEdit,
    handleDeleteDialogChange,
    handleEditItem,
    handleDeleteItem,
    handleDelete,
    handleNext,
    handlePrev,
  } = useRoadmapTab({
    search,
    cursor,
    onCursorChange,
    createOpen,
    onCreateOpenChange,
    status,
    managedProductId,
    sort,
    projectId,
    horizon,
    ownerId,
    onItemsChange,
  });

  const offlineEmptyState = (
    <div className="relative flex h-full flex-1 flex-col items-center justify-center py-12">
      <div
        className={cn(
          PM_PANEL,
          "relative flex w-full max-w-sm flex-col items-center gap-3 px-6 py-8 text-center",
        )}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-primary/[0.06] shadow-sm">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            You&apos;re offline
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Results may not be up to date. Reconnect to see the latest roadmap
            items.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageState
        resolution={resolution}
        loading={<RoadmapBoardSkeleton />}
        empty={
          isOnline ? (
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="projects"
              title={
                isFiltered
                  ? "No roadmap items match your filters"
                  : "No roadmap items yet"
              }
              description={
                isFiltered
                  ? undefined
                  : "Plan what's coming and share it publicly with your users."
              }
              filtersActive={isFiltered}
              onClearFilters={onClearFilters}
              action={
                isFiltered
                  ? undefined
                  : { label: "Add roadmap item", onClick: handleOpenSheet }
              }
            />
          ) : (
            offlineEmptyState
          )
        }
        onRetry={handleRetry}
        className={CONTENT_FILL_PANEL}
      >
        <BuildPaginatedContent
          ariaLabel="Roadmap items"
          contentClassName="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
          footer={(
            <TablePagination
              mode="cursor"
              rowCount={(data?.data ?? []).length}
              pageNumber={pager.pageNumber}
              hasMore={hasNext}
              hasPrevious={pager.hasPrevious}
              onNext={handleNext}
              onPrevious={handlePrev}
            />
          )}
        >
            {ROADMAP_COLUMNS.map((col) => (
              <PmPanel
                key={col.status}
                className="flex min-h-[120px] flex-col p-2"
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-dense font-medium uppercase tracking-wide text-muted-foreground">
                    {col.label}
                  </span>
                  <span className="min-w-[20px] rounded-full border border-border/50 bg-background/80 px-1.5 py-0.5 text-center text-dense tabular-nums text-muted-foreground">
                    {(grouped[col.status] ?? []).length}
                  </span>
                </div>
                {(grouped[col.status] ?? []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
                    Empty
                  </div>
                ) : (
                  <PmStaggerList className="flex flex-col gap-1.5">
                    {(grouped[col.status] ?? []).map((item) => (
                      <RoadmapItemCard
                        key={item.id}
                        item={item}
                        onEdit={handleEditItem}
                        onDelete={handleDeleteItem}
                      />
                    ))}
                  </PmStaggerList>
                )}
              </PmPanel>
            ))}
        </BuildPaginatedContent>
      </PageState>

      {sheetOpen ? <RoadmapItemSheet onClose={handleCloseSheet} /> : null}
      {editTarget ? (
        <RoadmapItemSheet item={editTarget} onClose={handleCloseEdit} />
      ) : null}
      {externalEditTarget ? (
        <RoadmapItemSheet
          item={externalEditTarget}
          onClose={onExternalEditClose ?? (() => {})}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteDialogChange}
        title="Delete roadmap item?"
        description={`"${deleteTarget?.title ?? ""}" will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
