"use client";

import { memo, useCallback, useMemo } from "react";
import { List, useDynamicRowHeight, type RowComponentProps } from "react-window";
import { useInfiniteAllWork } from "@/hooks/api/build/all-work";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { KanbanTicketCard } from "../views/kanban-ticket-card";
import { formatStatusName } from "../views/kanban-board-utils";
import type { AllWorkFilters } from "@/types/projects";
import type { DisplayOptions, KanbanTicket } from "../shared/types";
import { buildTicketMetaMap, mapAllWorkTicketToKanban } from "./map-all-work-ticket";
import type { AllWorkTicketMeta } from "./map-all-work-ticket";

const COLUMN_PAGE_SIZE = 50;
const COLUMN_PAGE_LIMIT = 5;
const DEFAULT_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];

interface MyWorkBoardProps {
  filters: AllWorkFilters;
  statuses?: readonly { name: string }[];
  tickets: KanbanTicket[];
  displayOptions: DisplayOptions;
  onTicketSelect: (meta: AllWorkTicketMeta) => void;
}

interface BoardRows {
  tickets: KanbanTicket[];
  displayOptions: DisplayOptions;
  onSelect: (id: number) => void;
  onNext: () => void;
  hasNext: boolean;
  isFetching: boolean;
  capped: boolean;
  status: string;
}

function BoardRow({ index, style, ariaAttributes, tickets, displayOptions, onSelect, onNext, hasNext, isFetching, capped, status }: RowComponentProps<BoardRows>) {
  const ticket = tickets[index];
  return (
    <div style={style} {...ariaAttributes} className="px-2 pb-2">
      {ticket ? <KanbanTicketCard ticket={ticket} isDragging={false} onSelect={onSelect} displayOptions={displayOptions} readOnly /> : capped ? (
        <p role="status" className="px-2 py-3 text-xs text-muted-foreground">250 tickets loaded in this column. Narrow your filters to see remaining tickets.</p>
      ) : <InfiniteScrollSentinel hasNextPage={hasNext} isFetchingNextPage={isFetching} onLoadMore={onNext} label={`Load next ${formatStatusName(status)} tickets`} />}
    </div>
  );
}

function rowKey(index: number, props: BoardRows) {
  return props.tickets[index]?.id ?? "next-page";
}

const MyWorkBoardColumn = memo(function MyWorkBoardColumn({ status, filters, displayOptions, onTicketSelect }: Omit<MyWorkBoardProps, "tickets" | "statuses"> & { status: string }) {
  const columnFilters = useMemo(() => ({ ...filters, cursor: undefined, status, limit: COLUMN_PAGE_SIZE }), [filters, status]);
  const query = useInfiniteAllWork(columnFilters);
  const { hasNextPage, isFetching, fetchNextPage, refetch } = query;
  const pageCount = query.data?.pages.length ?? 0;
  const capped = pageCount >= COLUMN_PAGE_LIMIT && query.hasNextPage;
  const rows = useMemo(() => query.data?.pages.slice(0, COLUMN_PAGE_LIMIT).flatMap((page) => page.data) ?? [], [query.data]);
  const tickets = useMemo(() => rows.map(mapAllWorkTicketToKanban), [rows]);
  const meta = useMemo(() => buildTicketMetaMap(rows), [rows]);
  const handleSelect = useCallback((id: number) => {
    const ticket = meta.get(id);
    if (ticket) onTicketSelect(ticket);
  }, [meta, onTicketSelect]);
  const handleNext = useCallback(() => {
    if (hasNextPage && !isFetching && pageCount < COLUMN_PAGE_LIMIT) void fetchNextPage();
  }, [hasNextPage, isFetching, fetchNextPage, pageCount]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const hasNext = Boolean(query.hasNextPage && !capped && !query.isFetchNextPageError);
  const rowProps = useMemo(() => ({ tickets, displayOptions, onSelect: handleSelect, onNext: handleNext, hasNext, isFetching: query.isFetchingNextPage, capped, status }), [tickets, displayOptions, handleSelect, handleNext, hasNext, query.isFetchingNextPage, capped, status]);
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: 170 });
  const total = query.data?.pages[0]?.total;

  return (
    <section aria-label={`${formatStatusName(status)} column`} className="flex min-h-0 w-72 shrink-0 flex-col rounded-xl border border-border bg-muted">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h2 className="truncate text-sm font-medium">{formatStatusName(status)}</h2>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground" aria-label={total == null ? `${tickets.length} loaded` : `${tickets.length} of ${total} loaded`}>{total ?? tickets.length}</span>
      </div>
      {query.isLoading ? <div role="status" aria-label={`Loading ${formatStatusName(status)} tickets`} className="flex flex-col gap-2 p-2"><Skeleton className="h-32" /><Skeleton className="h-32" /></div> : null}
      {query.isError ? <div role="alert" className="p-3 text-xs text-muted-foreground"><p>{getErrorMessage(query.error)}</p><LoadingButton type="button" variant="outline" isPending={query.isFetching} onClick={handleRetry}>Retry column</LoadingButton></div> : null}
      {!query.isLoading && !query.isError && tickets.length === 0 ? <p className="p-4 text-center text-sm text-muted-foreground">No tickets match this status.</p> : null}
      {tickets.length > 0 ? <List<BoardRows> className="min-h-0 flex-1" defaultHeight={320} rowCount={tickets.length + (hasNext || capped ? 1 : 0)} rowHeight={rowHeight} rowComponent={BoardRow} rowProps={rowProps} rowKey={rowKey} overscanCount={3} /> : null}
    </section>
  );
});

export const MyWorkBoard = memo(function MyWorkBoard({ filters, statuses, tickets, displayOptions, onTicketSelect }: MyWorkBoardProps) {
  const columns = useMemo(() => {
    const included = filters.status?.split(",").filter(Boolean);
    const excluded = new Set(filters.excludeStatus?.split(",") ?? []);
    const candidates = included ?? [...new Set([...DEFAULT_STATUSES, ...(statuses ?? []).map((status) => status.name), ...tickets.map((ticket) => ticket.status)])];
    return candidates.filter((status) => !excluded.has(status));
  }, [filters.status, filters.excludeStatus, statuses, tickets]);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-3 overflow-x-auto overscroll-x-contain pb-1">
      {columns.map((status) => <MyWorkBoardColumn key={status} status={status} filters={filters} displayOptions={displayOptions} onTicketSelect={onTicketSelect} />)}
    </div>
  );
});
