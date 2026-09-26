"use client";

import { useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { useCursorPagination } from "@/hooks/common/use-cursor-pagination";
import { useUrlFilters } from "@/lib/url-state/use-url-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useKbPagesTrash, useEmptyKbTrash } from "@/hooks/api/kb";
import {
  useKbBulkRestorePages,
  useKbBulkPurgePages,
  useKbTrashPurgeImpact,
} from "@/hooks/api/kb/pages";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";
import { KbRotateCcwIcon, KbTrash2Icon } from "@/features/wiki/lib/kb-icons";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import { TrashRetentionSection } from "@/features/wiki/components/trash-retention-section";
import { getErrorMessage } from "@/lib/get-error-message";

const DEFAULT_LIMIT = 50;
const ALL_MEMBERS_VALUE = "all";
const ALL_SPACES_VALUE = "all";

function TrashSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  );
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
  const deletedFrom = searchParams.get("deletedFrom") ?? undefined;
  const deletedBefore = searchParams.get("deletedBefore") ?? undefined;

  const [searchDraft, setSearchDraft] = useState(q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const { data: membersPage } = useOrgMembers(1, 100);
  const members = membersPage?.data ?? [];
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

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
  const selectedIds = [...selected].map(Number);
  const { data: purgeImpact } = useKbTrashPurgeImpact(selectedIds, {
    enabled: bulkPurgeConfirmOpen,
  });

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
      deletedByMembershipId: value === ALL_MEMBERS_VALUE ? null : value,
    });
  }

  function handleSpaceChange(value: string) {
    cursorState.reset();
    updateFilters({ spaceId: value === ALL_SPACES_VALUE ? null : value });
  }

  function handleDeletedFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    cursorState.reset();
    updateFilters({ deletedFrom: raw ? new Date(raw).toISOString() : null });
  }

  function handleDeletedBeforeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    cursorState.reset();
    updateFilters({ deletedBefore: raw ? new Date(raw).toISOString() : null });
  }

  function handleEmptyTrash() {
    emptyTrash.mutate(undefined, {
      onSuccess: (d) =>
        toast.success(
          `Emptied trash — ${d.purgedCount} page${d.purgedCount === 1 ? "" : "s"} permanently deleted`,
        ),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
    setEmptyConfirmOpen(false);
  }

  function handleBulkRestore() {
    bulkRestore.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(
          `Restored ${selectedIds.length} page${selectedIds.length === 1 ? "" : "s"}`,
        );
        setSelected(new Set());
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleBulkPurge() {
    bulkPurge.mutate(selectedIds, {
      onSuccess: () => {
        toast.success(
          `Permanently deleted ${selectedIds.length} page${selectedIds.length === 1 ? "" : "s"}`,
        );
        setSelected(new Set());
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
    setBulkPurgeConfirmOpen(false);
  }

  const selectedCount = selected.size;
  const pageCount = data?.data.length ?? 0;

  const actions = (
    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBulkRestore}
            disabled={bulkRestore.isPending}
          >
            <KbRotateCcwIcon className="mr-1.5 h-3.5 w-3.5" />
            Restore {selectedCount}
          </Button>
          {canPurge && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={bulkPurge.isPending}
              onClick={() => setBulkPurgeConfirmOpen(true)}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            >
              <KbTrash2Icon className="mr-1.5 h-3.5 w-3.5" />
              Purge {selectedCount}
            </Button>
          )}
        </>
      )}
      {canPurge && canManageSettings && pageCount > 0 && selectedCount === 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEmptyConfirmOpen(true)}
          disabled={emptyTrash.isPending}
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          Empty Trash
        </Button>
      )}
    </div>
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
              className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
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
        <div className="space-y-4">
          {canManageSettings ? <TrashRetentionSection /> : null}

          <div className="flex gap-2 flex-wrap">
            <Input
              type="search"
              placeholder="Search deleted pages…"
              value={searchDraft}
              onChange={handleSearchChange}
              className="max-w-sm"
              aria-label="Search deleted pages"
            />
            <Select
              value={
                deletedByMembershipId !== undefined
                  ? String(deletedByMembershipId)
                  : ALL_MEMBERS_VALUE
              }
              onValueChange={handleMemberChange}
            >
              <SelectTrigger className="w-52" aria-label="Deleted by member">
                <SelectValue placeholder="All members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_MEMBERS_VALUE}>All members</SelectItem>
                {members.map((member) => (
                  <SelectItem
                    key={member.membershipId}
                    value={String(member.membershipId)}
                  >
                    {getUserDisplayName(member)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={spaceId !== undefined ? String(spaceId) : ALL_SPACES_VALUE}
              onValueChange={handleSpaceChange}
            >
              <SelectTrigger className="w-52" aria-label="Space">
                <SelectValue placeholder="All spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SPACES_VALUE}>All spaces</SelectItem>
                {spaces.map((space) => (
                  <SelectItem key={space.id} value={String(space.id)}>
                    {space.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              aria-label="Deleted from"
              value={deletedFrom ? deletedFrom.slice(0, 10) : ""}
              onChange={handleDeletedFromChange}
              className="w-40"
            />
            <Input
              type="date"
              aria-label="Deleted before"
              value={deletedBefore ? deletedBefore.slice(0, 10) : ""}
              onChange={handleDeletedBeforeChange}
              className="w-40"
            />
          </div>

          <PageState
            resolution={pageState}
            loading={<TrashSkeleton />}
            empty={
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <KbTrash2Icon className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Trash is empty</p>
                <p className="text-sm text-muted-foreground">
                  Deleted pages will appear here and can be restored or
                  permanently removed.
                </p>
              </div>
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
                <div className="flex items-center justify-between gap-2 p-3">
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
                          className="text-xs font-medium text-amber-700 dark:text-amber-400"
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

      <ConfirmDialog
        open={emptyConfirmOpen}
        onOpenChange={setEmptyConfirmOpen}
        title="Empty the trash?"
        description={
          data?.pagination.hasMore
            ? "This permanently deletes every page currently in the trash, not just the ones shown on this page. This cannot be undone."
            : `All ${pageCount} page${pageCount === 1 ? "" : "s"} in the trash will be permanently deleted. This cannot be undone.`
        }
        confirmLabel="Empty Trash"
        destructive
        isPending={emptyTrash.isPending}
        onConfirm={handleEmptyTrash}
      />

      <ConfirmDialog
        open={bulkPurgeConfirmOpen}
        onOpenChange={setBulkPurgeConfirmOpen}
        title={`Permanently delete ${selectedCount} page${selectedCount === 1 ? "" : "s"}?`}
        description={
          purgeImpact && purgeImpact.descendantCount > 0
            ? `This cannot be undone. ${purgeImpact.descendantCount} child page${purgeImpact.descendantCount === 1 ? "" : "s"} nested under the selection will also be permanently removed, along with history, attachments, and index entries.`
            : "This cannot be undone. The selected pages will be permanently removed along with their history, attachments, and index entries."
        }
        confirmLabel="Delete Forever"
        destructive
        isPending={bulkPurge.isPending}
        onConfirm={handleBulkPurge}
      />
    </>
  );
}
