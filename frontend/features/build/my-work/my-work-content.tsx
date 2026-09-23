"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { BulkActionBar } from "@/features/build/backlog/bulk-action-bar";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { getTicketDetailHref } from "@/components/shared/format-ticket-key";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { BuildListSortField, BuildListSortDirection, BuildListGrouping } from "@/features/build/shared/use-build-list-url-state";
import type { AllWorkTicket, CursorPaginatedResponse } from "@/types/projects";
import type { AllWorkTicketMeta } from "./map-all-work-ticket";
import type { DueBucket } from "./my-work-rows";
import type { MyWorkView } from "./my-work-view";
import type { UseMyWorkBulkReturn } from "./use-my-work-bulk";
import { AllWorkListSkeleton, BucketSection, BUCKET_ORDER } from "./my-work-rows";
import { MyWorkViewBody } from "./my-work-view-body-lazy";
import { MyWorkPaginationBar } from "./my-work-pagination-bar";

const TABLE_COLUMNS: DataTableColumn<KanbanTicket>[] = [
  {
    key: "title",
    header: "Title",
    className: "min-w-[14rem] flex-1",
    cell: (t) => (
      <span className="text-sm font-medium leading-tight">{t.title}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (t) => (
      <span className="text-xs text-muted-foreground">{t.status}</span>
    ),
  },
  {
    key: "priority",
    header: "Priority",
    cell: (t) => (
      <span className="text-xs text-muted-foreground">
        {t.priority ?? "—"}
      </span>
    ),
  },
  {
    key: "dueDate",
    header: "Due",
    cell: (t) => (
      <span className="text-xs tabular-nums text-muted-foreground">
        {t.dueDate ?? "—"}
      </span>
    ),
  },
];

interface MyWorkContentProps {
  pageState: PageStateResolution;
  view: MyWorkView;
  grouping: BuildListGrouping;
  showBucketList: boolean;
  activeData: CursorPaginatedResponse<AllWorkTicket> | undefined;
  kanbanTickets: KanbanTicket[];
  ticketMeta: Map<number, AllWorkTicketMeta>;
  dueBuckets: Record<DueBucket, AllWorkTicket[]> | null;
  displayOptions: DisplayOptions;
  emptyTitle: string;
  emptyDescription: string;
  filtersActive: boolean;
  sortField: BuildListSortField;
  sortDirection: BuildListSortDirection;
  pageNumber: number;
  hasPrevious: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onSortChange: (field: string, direction: "asc" | "desc") => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  bulk: UseMyWorkBulkReturn;
  orgStatuses: readonly { name: string; color: string | null; type?: string | null }[] | undefined;
}

export const MyWorkContent = memo(function MyWorkContent({
  pageState,
  view,
  grouping: _grouping,
  showBucketList,
  activeData,
  kanbanTickets,
  ticketMeta,
  dueBuckets,
  displayOptions,
  emptyTitle,
  emptyDescription,
  filtersActive,
  sortField,
  sortDirection,
  pageNumber,
  hasPrevious,
  onRetry,
  onClearFilters,
  onSortChange,
  onNextPage,
  onPreviousPage,
  bulk,
  orgStatuses,
}: MyWorkContentProps) {
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const handleTicketSelect = useCallback(
    (id: number) => {
      const meta = ticketMeta.get(id);
      if (!meta) return;
      router.push(
        getTicketDetailHref(meta.projectId, meta.projectKey, meta.ticketNumber),
      );
    },
    [ticketMeta, router],
  );

  const handleRowClick = useCallback(
    (row: KanbanTicket) => handleTicketSelect(row.id),
    [handleTicketSelect],
  );

  const sortState: DataTableSortState = {
    fields: ["rank", "created", "updated", "priority", "dueDate"] as const,
    field: sortField,
    direction: sortDirection,
    onChange: onSortChange,
  };

  const hasMore = activeData?.hasMore ?? false;

  const emptySlot = isOnline ? (
    <EmptyState
      illustrationPreset="projects"
      title={emptyTitle}
      description={filtersActive ? undefined : emptyDescription}
      filtersActive={filtersActive}
      onClearFilters={onClearFilters}
      className={CONTENT_FILL_PANEL}
    />
  ) : (
    <div
      className={`${CONTENT_FILL_PANEL} flex items-center justify-center`}
    >
      <p className="text-sm text-muted-foreground">
        You&apos;re offline — results may not be up to date
      </p>
    </div>
  );

  return (
    <PageState
      resolution={pageState}
      loading={<AllWorkListSkeleton />}
      empty={emptySlot}
      onRetry={onRetry}
      className="flex min-h-0 flex-1 flex-col"
    >
      {view === "table" ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {bulk.selectedCount > 0 ? (
            <BulkActionBar
              selectedCount={bulk.selectedCount}
              members={[]}
              cycles={[]}
              statuses={orgStatuses}
              hideCycle
              onBulkStatus={bulk.handleBulkStatus}
              onBulkPriority={bulk.handleBulkPriority}
              onBulkAssignee={bulk.handleBulkAssignee}
              onBulkCycle={bulk.handleBulkCycleNoOp}
              onClear={bulk.handleClearSelection}
            />
          ) : null}
          <DataTable
            data={kanbanTickets}
            columns={TABLE_COLUMNS}
            getRowKey={(row) => row.id}
            onRowClick={handleRowClick}
            sortState={sortState}
            selection={{
              selected: bulk.tableSelection,
              onChange: bulk.setTableSelection,
              getRowLabel: (row) => row.title,
            }}
            pagination={{
              mode: "cursor",
              pageSize: 50,
              pageNumber,
              hasMore,
              hasPrevious,
              onNext: onNextPage,
              onPrevious: onPreviousPage,
            }}
            mobileCard={(row) => (
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-sm font-medium">{row.title}</span>
                <span className="text-xs text-muted-foreground">
                  {row.status} · {row.priority ?? "—"}
                </span>
              </div>
            )}
            emptyState={emptySlot}
          />
        </div>
      ) : showBucketList ? (
        <ScrollArea className="min-h-0 flex-1" hideScrollbar>
          <div className="flex flex-col gap-3">
            {BUCKET_ORDER.map((bucket) => {
              const items =
                dueBuckets?.[bucket]?.map((t) => ({
                  id: t.id,
                  projectId: t.projectId ?? 0,
                  projectName: t.projectName ?? "",
                  projectKey: t.projectKey ?? "",
                  ticketNumber: t.ticketNumber,
                  title: t.title,
                  status: t.status,
                  priority: t.priority,
                  type: t.type,
                  dueDate: t.dueDate,
                })) ?? [];
              if (items.length === 0) return null;
              return <BucketSection key={bucket} bucket={bucket} items={items} />;
            })}
            <MyWorkPaginationBar
              pageNumber={pageNumber}
              hasPrevious={hasPrevious}
              hasMore={hasMore}
              onPrevious={onPreviousPage}
              onNext={onNextPage}
            />
          </div>
        </ScrollArea>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MyWorkViewBody
            view={view}
            tickets={kanbanTickets}
            displayOptions={displayOptions}
            ticketMeta={ticketMeta}
          />
          <MyWorkPaginationBar
            pageNumber={pageNumber}
            hasPrevious={hasPrevious}
            hasMore={hasMore}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
          />
        </div>
      )}
    </PageState>
  );
});
