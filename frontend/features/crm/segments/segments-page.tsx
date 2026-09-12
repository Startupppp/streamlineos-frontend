"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
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
 * No table is written here. The columns, their labels, the description under the
 * name and the mobile card all come from `SEGMENT_LAYOUT`; the source column
 * takes its labels from `GET /crm/segments/sources` through `withSegmentSources`
 * rather than from a lookup written beside the column, which is what stops a
 * renamed source reading as a raw key. What is left on this page is the search,
 * the two row controls and which sheet a row opens.
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

  /** The row that was clicked, as the summary the sheets take. */
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
