"use client";

import { DatePicker } from "@/components/ui/date-picker";

import { useState, useRef, useEffect } from "react";
import { addDays, format, isValid, parseISO } from "date-fns";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useSourceOverride } from "@/hooks/common/use-source-override";
import { useUrlFilters } from "@/lib/url-state/use-url-filters";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WikiTableRowsSkeleton } from "./wiki-collection-skeletons";
import { useCan } from "@/hooks/api/access";
import { useKbPagesTrash, useEmptyKbTrash } from "@/hooks/api/kb/pages";
import {
  useKbBulkRestorePages,
  useKbBulkPurgePages,
  useKbTrashPurgeImpact,
} from "@/hooks/api/kb/pages";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import { reportTrashBulkResult, TrashBulkActions, TrashBulkPurgeConfirmation, TrashEmptyConfirmation } from "./trash-bulk-actions";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { TrashRetentionSection } from "@/features/wiki/components/trash-retention-section";
import { TrashMemberFilter } from "@/features/wiki/components/trash-member-filter";
import { getErrorMessage } from "@/lib/get-error-message";

const DEFAULT_LIMIT = 50;
const ALL_SPACES_VALUE = "all";

function dateFilterBoundary(value: string | null, throughDay: boolean): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = parseISO(value);
  if (!isValid(date)) return undefined;
  return (throughDay ? addDays(date, 1) : date).toISOString();
}

function dateFilterDisplay(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = parseISO(value);
  return isValid(date) ? format(date, "yyyy-MM-dd") : "";
}

export default function TrashPage() {
  const searchParams = useSearchParams();
  const { update: updateFilters, isPending: filtersPending } = useUrlFilters({
    pageParam: "cursor",
  });

  const q = searchParams.get("q") ?? undefined;
  const spaceIdRaw = searchParams.get("spaceId");
  const spaceId = spaceIdRaw ? Number(spaceIdRaw) : undefined;
  const deletedByRaw = searchParams.get("deletedByMembershipId");
  const deletedByMembershipId =
    deletedByRaw && Number.isInteger(Number(deletedByRaw)) && Number(deletedByRaw) > 0
      ? Number(deletedByRaw)
      : undefined;
  const deletedFromRaw = searchParams.get("deletedFrom");
  const deletedBeforeRaw = searchParams.get("deletedBefore");
  const deletedFrom = dateFilterBoundary(deletedFromRaw, false);
  const deletedBefore = dateFilterBoundary(deletedBeforeRaw, true);

  const [searchDraft, setSearchDraft] = useSourceOverride(q ?? "", q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [q]);

  const cursorState = useCursorPagination();
  const params = {
    cursor: cursorState.cursor,
    limit: DEFAULT_LIMIT,
    q: q || undefined,
    spaceId,
    deletedByMembershipId,
    deletedFrom,
    deletedBefore,
  };

  const { data, isLoading, isError, error, refetch } = useKbPagesTrash(params);
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  const filtersActive =
    (q ?? "") !== "" ||
    spaceId !== undefined ||
    deletedByMembershipId !== undefined ||
    deletedFrom !== undefined ||
    deletedBefore !== undefined;

  const canPurge = useCan("kb:pages:purge");
  const canManageSettings = useCan("kb:settings:manage");
  const pageState = usePageState({
    permission: "kb:pages:view",
    isLoading,
    isError,
    error,
    isEmpty: !isLoading && !isError && (data?.data.length ?? 0) === 0,
  });

  const emptyTrash = useEmptyKbTrash();
  const bulkRestore = useKbBulkRestorePages();
  const bulkPurge = useKbBulkPurgePages();

  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [emptyConfirmOpen, setEmptyConfirmOpen] = useState(false);
  const [bulkPurgeConfirmOpen, setBulkPurgeConfirmOpen] = useState(false);
  const [emptyWriteError, setEmptyWriteError] = useState<unknown>(null);
  const [purgeWriteError, setPurgeWriteError] = useState<unknown>(null);
  const selectedIds = [...selected].map(Number);
  const {
    data: purgeImpact,
    isLoading: purgeImpactLoading,
    isError: purgeImpactError,
    error: purgeImpactReadError,
    refetch: refetchPurgeImpact,
  } = useKbTrashPurgeImpact(selectedIds, {
    enabled: bulkPurgeConfirmOpen,
  });
  const canConfirmPurge = canPurge && !purgeImpactLoading && !purgeImpactError && !!purgeImpact && selectedIds.length > 0;
  let purgeImpactDescription = "This cannot be undone. The selected pages will be permanently removed along with their history, attachments, and index entries.";
  if (!canPurge) {
    purgeImpactDescription = "You no longer have permission to permanently delete these pages.";
  } else if (purgeImpactLoading) {
    purgeImpactDescription = "Checking child files and dependent data before permanent deletion.";
  } else if (purgeImpactError) {
    purgeImpactDescription = "Could not verify the impact of permanently deleting these pages. Retry the check before continuing.";
  } else if (!purgeImpact) {
    purgeImpactDescription = "Deletion impact is unavailable. Retry the check before continuing.";
  } else if (purgeImpact.descendantCount > 0) {
    purgeImpactDescription = `This cannot be undone. ${purgeImpact.descendantCount} child file${purgeImpact.descendantCount === 1 ? "" : "s"} nested under the selection will also be permanently removed, along with history, attachments, and index entries.`;
  }

  function handleRetryPurgeImpact() {
    void refetchPurgeImpact();
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setSearchDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      cursorState.reset();
      updateFilters({ q: value || null });
    }, 350);
  }

  function handleMemberChange(value: string) {
    cursorState.reset();
    updateFilters({
      deletedByMembershipId: value === "all" ? null : value,
    });
  }

  function handleSpaceChange(value: string) {
    cursorState.reset();
    updateFilters({ spaceId: value === ALL_SPACES_VALUE ? null : value });
  }

  function handleDeletedFromChange(value: string) {
    cursorState.reset();
    updateFilters({ deletedFrom: value || null });
  }

  function handleDeletedBeforeChange(value: string) {
    cursorState.reset();
    updateFilters({ deletedBefore: value || null });
  }

  function handleClearFilters() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchDraft("");
    cursorState.reset();
    updateFilters({
      q: null,
      spaceId: null,
      deletedByMembershipId: null,
      deletedFrom: null,
      deletedBefore: null,
    });
  }

  function handleEmptyTrash() {
    setEmptyWriteError(null);
    emptyTrash.mutate(undefined, {
      onSuccess: (d) => {
        toast.success(
          `Emptied trash — ${d.purgedCount} page${d.purgedCount === 1 ? "" : "s"} permanently deleted`,
        );
        setEmptyConfirmOpen(false);
      },
      onError: (e) => { setEmptyWriteError(e); toast.error(getErrorMessage(e)); },
    });
  }

  function handleBulkRestore() {
    bulkRestore.mutate(selectedIds, {
      onSuccess: (result) => reportTrashBulkResult(result, "restore", setSelected),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleBulkPurge() {
    if (!canConfirmPurge) return;
    setPurgeWriteError(null);
    bulkPurge.mutate(selectedIds, {
      onSuccess: (result) => { reportTrashBulkResult(result, "purge", setSelected); setBulkPurgeConfirmOpen(false); },
      onError: (e) => { setPurgeWriteError(e); toast.error(getErrorMessage(e)); },
    });
  }

  function handleMobileSelectionChange(id: number, checked: boolean) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (checked) next.add(String(id));
      else {
        next.delete(String(id));
        next.delete(id);
      }
      return next;
    });
  }

  const selectedCount = selected.size;
  const pageCount = data?.data.length ?? 0;

  const actions = (
    <TrashBulkActions
      selectedCount={selectedCount}
      pageCount={pageCount}
      canPurge={canPurge}
      canManageSettings={canManageSettings}
      restoring={bulkRestore.isPending}
      purging={bulkPurge.isPending}
      emptying={emptyTrash.isPending}
      onRestore={handleBulkRestore}
      onPurge={() => { setPurgeWriteError(null); setBulkPurgeConfirmOpen(true); }}
      onEmpty={() => { setEmptyWriteError(null); setEmptyConfirmOpen(true); }}
    />
  );

  const columns: DataTableColumn<KbPageListItem>[] = [
    {
      key: "title",
      header: "Page",
      cell: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.icon && (
            <span className="shrink-0 text-base leading-none">{row.icon}</span>
          )}
          <span className="truncate font-medium">
            {row.title || "Untitled"}
          </span>
          {row.legalHold && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-status-warning-surface text-status-warning-ink border border-status-warning-rule"
              title={row.legalHoldReason ?? "Page is under a legal hold and cannot be purged"}
              aria-label="Legal hold"
            >
              Legal hold
            </span>
          )}
        </div>
      ),
    },
    {
      key: "deletedAt",
      header: "Deleted",
      cell: (row) => (
        <span className="tabular-nums text-muted-foreground text-sm">
          {row.deletedAt ? kbTimeAgo(row.deletedAt) : ""}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageWrapper
        title="Trash"
        subtitle="Deleted pages can be restored or permanently removed"
        actions={actions}
      >
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {canManageSettings ? <TrashRetentionSection /> : null}

          <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
            <Input
              type="search"
              placeholder="Search deleted pages…"
              value={searchDraft}
              onChange={handleSearchChange}
              className="w-64 max-w-sm"
              aria-label="Search deleted pages"
            />
            <TrashMemberFilter value={deletedByMembershipId} onChange={handleMemberChange} />
            <Select
              value={spaceId !== undefined ? String(spaceId) : ALL_SPACES_VALUE}
              onValueChange={handleSpaceChange}
            >
              <SelectTrigger className="w-52" aria-label="Team folder">
                <SelectValue placeholder="All team folders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SPACES_VALUE}>All team folders</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker
              ariaLabel="Deleted from"
              value={dateFilterDisplay(deletedFromRaw)}
              onChange={handleDeletedFromChange}
              placeholder="From"
              dateFormat="dd MMM yyyy"
              clearable
              className="w-40"
            />
            <DatePicker
              ariaLabel="Deleted through"
              value={dateFilterDisplay(deletedBeforeRaw)}
              onChange={handleDeletedBeforeChange}
              placeholder="Through"
              dateFormat="dd MMM yyyy"
              clearable
              className="w-40"
            />
          </div>

          <PageState
            resolution={pageState}
            loading={<WikiTableRowsSkeleton headers={["Page", "Deleted"]} />}
            empty={
              cursorState.hasPrevious ? (
                <EmptyState
                  illustration={<KbTrash2Icon className="h-8 w-8 text-muted-foreground" />}
                  title="No deleted files on this page"
                  description="The deleted files on this page may have changed. Go back to continue browsing."
                  action={{ label: "Previous page", onClick: cursorState.goPrevious }}
                />
              ) : (
                <EmptyState
                  illustration={
                    <KbTrash2Icon className="h-8 w-8 text-muted-foreground" />
                  }
                  title="Trash is empty"
                  description={
                    filtersActive
                      ? "Deleted pages are being hidden by the filters above."
                      : "Deleted pages will appear here and can be restored or permanently removed."
                  }
                  filtersActive={filtersActive}
                  filteredTitle="No deleted files match your filters."
                  onClearFilters={handleClearFilters}
                />
              )
            }
            onRetry={refetch}
          >
            <DataTable
              data={data?.data ?? []}
              columns={columns}
              getRowKey={(row) => row.id}
              isLoading={isLoading || filtersPending}
              selection={{
                selected,
                onChange: setSelected,
                getRowLabel: (row) => row.title || "Untitled",
              }}
              pagination={{
                mode: "cursor",
                pageSize: DEFAULT_LIMIT,
                pageNumber: cursorState.pageNumber,
                hasMore: data?.pagination.hasMore ?? false,
                hasPrevious: cursorState.hasPrevious,
                onNext: () => cursorState.goNext(data?.pagination.nextCursor),
                onPrevious: cursorState.goPrevious,
              }}
              mobileCard={(row) => (
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected.has(String(row.id)) || selected.has(row.id)}
                    onCheckedChange={(checked) => handleMobileSelectionChange(row.id, checked === true)}
                    aria-label={`Select ${row.title || "Untitled"}`}
                    className="shrink-0"
                  />
                  <div className="flex items-center gap-2 min-w-0">
                    {row.icon && (
                      <span className="shrink-0 text-base">{row.icon}</span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {row.title || "Untitled"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.deletedAt ? kbTimeAgo(row.deletedAt) : ""}
                      </p>
                      {row.legalHold && (
                        <p
                          className="text-xs font-medium text-status-warning-ink"
                          title={row.legalHoldReason ?? undefined}
                        >
                          Legal hold
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              emptyState={
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <KbTrash2Icon className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No matching deleted pages
                  </p>
                </div>
              }
            />
          </PageState>
        </div>
      </PageWrapper>

      <TrashEmptyConfirmation
        open={emptyConfirmOpen}
        onOpenChange={setEmptyConfirmOpen}
        pageCount={pageCount}
        hasMore={data?.pagination.hasMore ?? false}
        isPending={emptyTrash.isPending}
        error={emptyWriteError}
        onConfirm={handleEmptyTrash}
      />

      <TrashBulkPurgeConfirmation
        open={bulkPurgeConfirmOpen}
        onOpenChange={setBulkPurgeConfirmOpen}
        selectedCount={selectedCount}
        description={purgeImpactDescription}
        canPurge={canPurge}
        impactLoading={purgeImpactLoading}
        impactError={purgeImpactError}
        impactAvailable={!!purgeImpact}
        impactReadError={purgeImpactReadError}
        writeError={purgeWriteError}
        canConfirm={canConfirmPurge}
        isPending={bulkPurge.isPending}
        onRetryImpact={handleRetryPurgeImpact}
        onConfirm={handleBulkPurge}
      />
    </>
  );
}
