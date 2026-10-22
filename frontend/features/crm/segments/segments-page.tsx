"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { RecordList, asRecordValues, type RecordValue } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import {
  SEGMENT_LAYOUT,
  segmentRecordFields,
  withSegmentSources,
} from "@/lib/renderer/crm/segment-layout";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useDeleteSegment,
  useSegment,
  useSegmentSources,
  useSegments,
} from "@/hooks/api/crm/segments";
import type { SegmentSummary } from "@/types/crm/segments";
import { SegmentMembersSheet } from "./segment-members-sheet";
import { SegmentSheet } from "./segment-sheet";


const PAGE_SIZE = 25;

export function SegmentsPage() {
  const canManage = useCan("crm:segments:manage");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [membersTarget, setMembersTarget] = useState<SegmentSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SegmentSummary | null>(null);

  const { data, isLoading, isError, error, refetch } = useSegments({
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const { data: sources } = useSegmentSources();
  const { data: editing } = useSegment(editId);
  const deleteSegment = useDeleteSegment();

  const tenantLayout = useTenantLayout(SEGMENT_LAYOUT);
  const layout = useMemo(
    () => withSegmentSources(tenantLayout, sources ?? []),
    [tenantLayout, sources],
  );

  const query = debouncedSearch.trim().toLowerCase();
  const matches = useMemo(() => {
    const all = data ?? [];
    if (query === "") return all;
    return all.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        (row.description ?? "").toLowerCase().includes(query),
    );
  }, [data, query]);

  const rows = useMemo(() => asRecordValues(matches.map(segmentRecordFields)), [matches]);

  const segmentFor = useCallback(
    (row: RecordValue) =>
      matches.find((candidate) => candidate.segmentId === row.segmentId) ?? null,
    [matches],
  );

  const handleOpenCreate = useCallback(() => {
    setEditId(null);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditId(null);
  }, []);

  const handleMembersOpenChange = useCallback((open: boolean) => {
    if (!open) setMembersTarget(null);
  }, []);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleClearSearch = useCallback(() => setSearch(""), []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleRowClick = useCallback(
    (row: RecordValue) => setMembersTarget(segmentFor(row)),
    [segmentFor],
  );

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteSegment.mutate(
      { segmentId: deleteTarget.segmentId },
      {
        onSuccess: () => {
          toast.success("Segment deleted");
          setDeleteTarget(null);
        },
        onError: (mutationError) => {
          toast.error(getErrorMessage(mutationError));
          setDeleteTarget(null);
        },
      },
    );
  }, [deleteSegment, deleteTarget]);

  const rowActions = useCallback(
    (row: RecordValue) => {
      const name = String(row.name ?? "");
      return (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Edit ${name}`}
            onClick={(event) => {
              event.stopPropagation();
              setEditId(String(row.segmentId));
              setSheetOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete ${name}`}
            onClick={(event) => {
              event.stopPropagation();
              setDeleteTarget(segmentFor(row));
            }}
          >
            Delete
          </Button>
        </div>
      );
    },
    [segmentFor],
  );

  const emptyState = (
    <EmptyState
      title="No segments yet"
      filtersActive={query !== ""}
      filteredTitle="No segments match that search"
      onClearFilters={handleClearSearch}
      description={
        query === ""
          ? "A segment is criteria with a name — industry, lifecycle stage, owner — re-evaluated every time somebody opens it, so it is never a stale list."
          : "Nothing on this page matches. Clear the search to see every segment."
      }
      action={canManage ? { label: "New segment", onClick: handleOpenCreate } : undefined}
      className="flex-1 min-h-0"
    />
  );

  const pageState = usePageState({
    permission: "crm:segments:view",
    isLoading,
    isError,
    error,
  });

  if (pageState.kind !== "ready" && pageState.kind !== "empty" && pageState.kind !== "loading")
    return (
      <PageWrapper
        title="Segments"
        subtitle="Named criteria over your CRM records, re-evaluated on every read."
        noInternalScroll
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
          {null}
        </PageState>
      </PageWrapper>
    );

  return (
    <PageWrapper
      title="Segments"
      subtitle="Named criteria over your CRM records, re-evaluated on every read."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder={layout.list.searchPlaceholder}
            value={search}
            onValueChange={handleSearchChange}
            className="min-w-0 flex-1 lg:max-w-md"
          />
        </div>
      }
      actions={
        canManage ? (
          <AnimatedIconButton
            icon={PlusIcon}
            iconSize={16}
            iconClassName="mr-1.5"
            size="sm"
            onClick={handleOpenCreate}
          >
            New segment
          </AnimatedIconButton>
        ) : undefined
      }
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      {isLoading ? (
        <DataTableSkeleton
          rows={10}
          columns={layout.list.columns.length}
          className="flex-1"
        />
      ) : (
        <RecordList
          layout={layout}
          rows={rows}
          getRowKey={(row) => String(row.segmentId)}
          emptyState={emptyState}
          onRowClick={handleRowClick}
          actions={canManage ? rowActions : undefined}
          minWidth="820px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            total: (page - 1) * pageSize + (data?.length ?? 0),
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
            pageSizeOptions: STANDARD_PAGE_SIZE_OPTIONS,
          }}
        />
      )}

      <SegmentSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        sources={sources ?? []}
        segment={editId === null ? null : (editing ?? null)}
      />

      <SegmentMembersSheet
        open={membersTarget !== null}
        onOpenChange={handleMembersOpenChange}
        segment={membersTarget}
        sources={sources ?? []}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Delete this segment?"
        description={
          deleteTarget
            ? `${deleteTarget.name} will be permanently deleted. No records are affected — a segment stores criteria, not the rows that match them.`
            : ""
        }
        confirmLabel="Delete segment"
        destructive
        isPending={deleteSegment.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
