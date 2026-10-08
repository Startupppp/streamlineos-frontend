"use client";

import { memo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { DataTable } from "@/components/ui/data-table";
import { MY_WORK_TABLE_COLUMNS } from "./my-work-table-columns";
import type { DataTableSortState } from "@/components/ui/data-table.types";
import { BulkActionBar } from "@/features/build/shared/bulk-action-bar";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { buildMyWorkReturnHref, getMyWorkTicketHref } from "@/features/build/ticket-details/build-ticket-detail-url";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import type { KanbanTicket, DisplayOptions } from "@/features/build/shared/types";
import type { BuildListSortField, BuildListSortDirection, BuildListGrouping } from "@/features/build/shared/use-build-list-url-state";
import type { AllWorkTicket, AllWorkFilters, CursorPaginatedResponse } from "@/types/projects";
import type { AllWorkTicketMeta } from "./map-all-work-ticket";
import type { DueBucket } from "./my-work-rows";
import type { MyWorkView } from "./my-work-view";
import type { UseMyWorkBulkReturn } from "./use-my-work-bulk";
import { AllWorkListSkeleton, BucketSection, BUCKET_ORDER } from "./my-work-rows";
import { MyWorkViewBody } from "./my-work-view-body-lazy";
import { TablePagination } from "@/components/ui/table-pagination";
import { useGuardedDocumentNavigation } from "@/hooks/common/use-guarded-document-navigation";
import { StatusBadge } from "@/components/shared/ticket-status-badge";
import { formatTicketKey } from "@/components/shared/format-ticket-key";
import { PriorityBadge } from "@/features/build/shared/priority-badge";
import { formatCalendarDate } from "@/lib/date-utils";
import { MY_WORK_PAGE_SIZE } from "./my-work-data-model";

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
  boardFilters: AllWorkFilters;
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
  boardFilters,
}: MyWorkContentProps) {
  const navigate = useGuardedDocumentNavigation();
  const isOnline = useOnlineStatus();
  const searchParams = useSearchParams();
  const returnHref = buildMyWorkReturnHref(searchParams);

  const handleTicketSelect = useCallback(
    (id: number) => {
      const meta = ticketMeta.get(id);
      if (!meta) return;
      navigate(getMyWorkTicketHref(meta.projectId, meta.projectKey, meta.ticketNumber, returnHref));
    },
    [ticketMeta, navigate, returnHref],
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
              hideAssignee
              onBulkStatus={bulk.handleBulkStatus}
              onBulkPriority={bulk.handleBulkPriority}
              onBulkAssignee={bulk.handleBulkAssignee}
              onBulkCycle={bulk.handleBulkCycleNoOp}
              onClear={bulk.handleClearSelection}
            />
          ) : null}
          <DataTable
            data={kanbanTickets}
            columns={MY_WORK_TABLE_COLUMNS}
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
              pageSize: MY_WORK_PAGE_SIZE,
              pageNumber,
              hasMore,
              hasPrevious,
              onNext: onNextPage,
              onPrevious: onPreviousPage,
            }}
            mobileCard={(row) => (
              <div className="flex min-w-0 flex-col gap-2 py-2">
                <span className="line-clamp-2 text-sm font-medium leading-5">
                  {row.title}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatTicketKey(row.project?.key, row.ticketNumber, row.id)}
                  </span>
                  <StatusBadge status={row.status} />
                  {row.priority ? <PriorityBadge priority={row.priority} /> : null}
                  {row.dueDate ? (
                    <span className="text-xs text-muted-foreground">
                      Due {formatCalendarDate(row.dueDate)}
                    </span>
                  ) : null}
                </div>
              </div>
            )}
            emptyState={emptySlot}
          />
        </div>
      ) : showBucketList ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
                    assignee: t.assignee,
                    assigneeId: t.assigneeId,
                    version: t.version,
                    labels: t.labels,
                  })) ?? [];
                if (items.length === 0) return null;
                return <BucketSection key={bucket} bucket={bucket} items={items} returnHref={returnHref} displayOptions={displayOptions} />;
              })}
            </div>
          </ScrollArea>
          <TablePagination
            mode="cursor"
            rowCount={kanbanTickets.length}
            pageNumber={pageNumber}
            hasPrevious={hasPrevious}
            hasMore={hasMore}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
            hideOnSinglePage
            compact
            showSummary={false}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <MyWorkViewBody
            view={view}
            tickets={kanbanTickets}
            displayOptions={displayOptions}
            ticketMeta={ticketMeta}
            boardFilters={boardFilters}
            orgStatuses={orgStatuses}
          />
          {view !== "board" ? <TablePagination
            mode="cursor"
            rowCount={kanbanTickets.length}
            pageNumber={pageNumber}
            hasPrevious={hasPrevious}
            hasMore={hasMore}
            onPrevious={onPreviousPage}
            onNext={onNextPage}
            hideOnSinglePage
            compact
            showSummary={false}
          /> : null}
        </div>
      )}
    </PageState>
  );
});
