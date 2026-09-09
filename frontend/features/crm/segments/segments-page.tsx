"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { STANDARD_PAGE_SIZE_OPTIONS } from "@/lib/list-pagination";
import { formatShortDate } from "@/lib/date-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
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

/**
 * Segments.
 *
 * The list is of *criteria*, not of people. Nothing on this page is a stored
 * membership, and the one number that would imply otherwise — a size beside each
 * row — is deliberately absent: showing it would mean one `COUNT` per row per
 * render, and a page that quietly issues twenty-five aggregate queries to draw a
 * table is the kind of cost nobody sees until a tenant has a hundred segments.
 * Opening a row evaluates that segment, once, and reports its exact size.
 *
 * Search filters the page in hand rather than the server, and that is a real
 * limitation stated rather than hidden: `GET /crm/segments` takes `limit` and
 * `offset` and no query, so this narrows what is already loaded. It is honest at
 * the scale a tenant's segment list actually reaches — dozens, not thousands —
 * and the empty state says which kind of empty it is.
 *
 * `noInternalScroll` because `DataTable` renders its own
 * `flex-1 min-h-0 overflow-auto` body. Leaving the page's content zone
 * scrollable too would nest one scroller inside another, and the sticky header
 * row would slide away from the rows it labels.
 */

const PAGE_SIZE = 25;

export function SegmentsPage() {
  const canView = useCan("crm:segments:view");
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
  /**
   * The stored criteria, fetched only while the edit sheet is open. The list
   * projects no criteria tree — it is the largest field on the row and no list
   * cell renders it — so editing reads the one segment it is about.
   */
  const { data: editing } = useSegment(editId);
  const deleteSegment = useDeleteSegment();

  const query = debouncedSearch.trim().toLowerCase();
  const rows = useMemo(() => {
    const all = data ?? [];
    if (query === "") return all;
    return all.filter(
      (row) =>
        row.name.toLowerCase().includes(query) ||
        (row.description ?? "").toLowerCase().includes(query),
    );
  }, [data, query]);

  const sourceLabel = useCallback(
    (sourceKey: string) =>
      (sources ?? []).find((candidate) => candidate.key === sourceKey)?.label ?? sourceKey,
    [sources],
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

  const columns = useMemo<DataTableColumn<SegmentSummary>[]>(
    () => [
      {
        key: "name",
        header: "Segment",
        cell: (row) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.name}</span>
            {row.description ? (
              <span className="truncate text-xs text-muted-foreground">{row.description}</span>
            ) : null}
          </div>
        ),
      },
      {
        key: "sourceKey",
        header: "Of",
        cell: (row) => sourceLabel(row.sourceKey),
      },
      {
        key: "createdByName",
        header: "Created by",
        cell: (row) => row.createdByName ?? "—",
      },
      {
        key: "updatedAt",
        header: "Updated",
        className: "font-mono tabular-nums",
        cell: (row) => formatShortDate(row.updatedAt),
      },
      {
        key: "actions",
        header: "",
        className: "w-32 text-right",
        cell: (row) =>
          canManage ? (
            <div className="flex justify-end gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Edit ${row.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setEditId(row.segmentId);
                  setSheetOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Delete ${row.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleteTarget(row);
                }}
              >
                Delete
              </Button>
            </div>
          ) : null,
      },
    ],
    [canManage, sourceLabel],
  );

  const emptyState = (
    <EmptyState
      title={query === "" ? "No segments yet" : "No segments match that search"}
      description={
        query === ""
          ? "A segment is criteria with a name — industry, lifecycle stage, owner — re-evaluated every time somebody opens it, so it is never a stale list."
          : "Nothing on this page matches. Clear the search to see every segment."
      }
      action={
        query === ""
          ? canManage
            ? { label: "New segment", onClick: handleOpenCreate }
            : undefined
          : { label: "Clear search", onClick: handleClearSearch }
      }
      actionVariant={query === "" ? undefined : "outline"}
      className="flex-1 min-h-0"
    />
  );

  return (
    <PageWrapper
      title="Segments"
      subtitle="Named criteria over your CRM records, re-evaluated on every read."
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <SearchInput
            placeholder="Search segments…"
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
      {!canView ? (
        <NoPermissionState permission="crm:segments:view" className="flex-1" />
      ) : isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load segments"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
        />
      ) : isLoading ? (
        <DataTableSkeleton rows={10} columns={columns.length} className="flex-1" />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row) => row.segmentId}
          emptyState={emptyState}
          onRowClick={setMembersTarget}
          minWidth="820px"
          className="flex-1 min-h-0"
          pagination={{
            mode: "server",
            page,
            pageSize,
            /**
             * The endpoint returns a page, not a total, so the count shown is
             * what has been loaded. Saying so with the real page length is
             * better than inventing a total the server never sent.
             */
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
