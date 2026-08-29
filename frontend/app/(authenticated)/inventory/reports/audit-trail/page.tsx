"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatDateTime } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import {
  useInventoryAuditEvents,
  type InventoryAuditEvent,
} from "@/hooks/api/inventory/audit-events";

const PAGE_SIZE = 50;

const COLUMNS: DataTableColumn<InventoryAuditEvent>[] = [
  {
    key: "createdAt",
    header: "When",
    className: "font-mono tabular-nums whitespace-nowrap",
    cell: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "action",
    header: "Action",
    cell: (row) => <Badge variant="outline">{row.action}</Badge>,
  },
  {
    key: "resourceType",
    header: "Resource",
    cell: (row) => <span className="truncate">{row.resourceType}</span>,
  },
  {
    key: "resourceId",
    header: "Reference",
    className: "font-mono tabular-nums",
    // The record's own business reference, not an opaque identifier: the trail
    // exists to be reconciled against the document it points at.
    cell: (row) => <span>#{row.resourceId}</span>,
  },
  {
    key: "actor",
    header: "Actor",
    cell: (row) => <span className="truncate">{row.actorName ?? "System"}</span>,
  },
];

export default function InventoryAuditTrailPage() {
  const canView = useCan("inventory:audit:read");
  const router = useRouter();
  const searchParams = useSearchParams();

  const resourceType = searchParams.get("resource") ?? "";
  const action = searchParams.get("action") ?? "";
  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";

  // G1. The trail is appended to while it is read, so it walks a
  // `(created_at, id)` keyset. There is no page count because the server is
  // never asked to count a table that only grows.
  const {
    cursor,
    pageNumber,
    hasPrevious,
    goNext,
    goPrevious,
    reset: resetCursor,
  } = useCursorPagination();

  const query = useInventoryAuditEvents({
    ...(resourceType ? { resourceType } : {}),
    ...(action ? { action } : {}),
    ...(fromDate ? { fromDate } : {}),
    ...(toDate ? { toDate } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
    limit: PAGE_SIZE,
  });

  const rows = useMemo(() => query.data?.items ?? [], [query.data]);
  const hasActiveFilters = Boolean(resourceType || action || fromDate || toDate);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      router.replace(`?${params.toString()}`, { scroll: false });
      resetCursor();
    },
    [router, searchParams, resetCursor],
  );

  const handleResourceChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setParam("resource", event.target.value),
    [setParam],
  );
  const handleActionChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setParam("action", event.target.value),
    [setParam],
  );
  const handleFromChange = useCallback((value: string) => setParam("from", value), [setParam]);
  const handleToChange = useCallback((value: string) => setParam("to", value), [setParam]);

  function handleRetry(): void {
    void query.refetch();
  }

  function handleClearFilters(): void {
    router.replace("?", { scroll: false });
    resetCursor();
  }

  function handleNextPage(): void {
    goNext(query.data?.nextCursor);
  }

  const filterBar = (
    <div className="flex w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
      <Input
        value={resourceType}
        onChange={handleResourceChange}
        placeholder="Resource type"
        aria-label="Filter by resource type"
        className="w-full sm:max-w-52"
      />
      <Input
        value={action}
        onChange={handleActionChange}
        placeholder="Action"
        aria-label="Filter by action"
        className="w-full sm:max-w-52"
      />
      <DatePicker value={fromDate} onChange={handleFromChange} placeholder="From" className="w-full sm:max-w-[160px]" />
      <DatePicker value={toDate} onChange={handleToChange} placeholder="To" className="w-full sm:max-w-[160px]" />
    </div>
  );

  if (!canView)
    return (
      <PageWrapper title="Audit Trail">
        <NoPermissionState permission="inventory:audit:read" className="flex-1" />
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Audit Trail"
      subtitle="Who changed which inventory record, and when."
      filters={filterBar}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {query.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load the audit trail"
            description={getErrorMessage(query.error)}
            onRetry={handleRetry}
          />
        ) : !query.isLoading && rows.length === 0 ? (
          <InventoryEmptyState
            className="flex-1"
            illustration={<EmptyActivityIllustration />}
            title={hasActiveFilters ? "No events match your filters" : "No audit events yet"}
            description={
              hasActiveFilters
                ? "Try adjusting or clearing your filters."
                : "Inventory changes are recorded here as they are posted."
            }
            {...(hasActiveFilters
              ? { action: { label: "Clear filters", onClick: handleClearFilters } }
              : {})}
          />
        ) : (
          <DataTable
            className="flex-1 min-h-0"
            data={rows}
            columns={COLUMNS}
            getRowKey={(row) => row.id}
            isLoading={query.isLoading}
            minWidth="800px"
            pagination={{
              mode: "cursor",
              pageSize: PAGE_SIZE,
              pageNumber,
              hasMore: query.data?.hasMore ?? false,
              hasPrevious,
              onNext: handleNextPage,
              onPrevious: goPrevious,
            }}
          />
        )}
      </div>
    </PageWrapper>
  );
}
