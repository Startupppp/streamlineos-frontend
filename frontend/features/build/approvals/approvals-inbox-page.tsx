"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useApprovalInbox, useUpdateApproval } from "@/hooks/api/build/approvals";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DecideDialog } from "./decide-dialog";
import { ApprovalBulkActionBar } from "./approval-bulk-action-bar";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/features/build/shared/use-build-list-keyboard";
import { ENTITY_OPTIONS, STATUS_OPTIONS } from "./approvals-constants";
import type { ApprovalInboxItem } from "@/types/projects";
import { PmPageShell, PmSection, CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import {
  INBOX_TABLE_HEADERS,
  type DecideTarget,
  buildApprovalsInboxColumns,
  ApprovalsInboxMobileCard,
} from "./approvals-inbox-columns";

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
  { param: "type", options: ENTITY_OPTIONS.map((o) => o.value) },
  { param: "from" },
  { param: "to" },
] as const;

export function ApprovalsInboxPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const canDecide = useCan("build:approvals:decide");
  const canManage = useCan("build:approvals:manage");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isOnline = useOnlineStatus();

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: true,
  });

  const statusFilter = listFilters.value("status");
  const typeFilter = listFilters.value("type");
  const fromFilter = listFilters.value("from");
  const toFilter = listFilters.value("to");
  const searchDisplay = listFilters.search;
  const searchParam = listFilters.debouncedSearch;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useApprovalInbox({
    status: statusFilter !== BUILD_FILTER_ALL ? statusFilter : undefined,
    type: typeFilter !== BUILD_FILTER_ALL ? typeFilter : undefined,
    q: searchParam || undefined,
    from: fromFilter !== BUILD_FILTER_ALL ? fromFilter : undefined,
    to: toFilter !== BUILD_FILTER_ALL ? toFilter : undefined,
  });
  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const [queueTarget, setQueueTarget] = useState<DecideTarget | null>(null);
  const [returnFocus, setReturnFocus] = useState<HTMLElement | null>(null);
  const selectionIds = ["projectId", "approvalId"].map((key) => {
    const raw = searchParams.get(key);
    if (!raw || searchParams.getAll(key).length !== 1 || !/^[1-9]\d{0,9}$/.test(raw)) return null;
    const id = Number(raw);
    return id <= 2_147_483_647 ? id : null;
  });
  const [projectId, approvalId] = selectionIds;
  const decideTarget = projectId && approvalId ? { projectId, approvalId } : null;
  const updateApproval = useUpdateApproval();
  const [selection, setSelection] = useState<Set<string | number>>(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);

  const pending = useMemo(
    () =>
      items.filter((a) => a.status === "pending" || a.status === "requested")
        .length,
    [items],
  );
  const overdue = useMemo(() => {
    const now = new Date();
    return items.filter(
      (a) =>
        a.dueAt &&
        new Date(a.dueAt) < now &&
        a.status !== "approved" &&
        a.status !== "rejected" &&
        a.status !== "cancelled",
    ).length;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (statusFilter === BUILD_FILTER_ALL) return items;
    return items.filter((a) => a.status === statusFilter);
  }, [items, statusFilter]);

  const memberName = useCallback(
    (userId: string | null): string => {
      if (!userId) return "—";
      const m = members.find((row) => row.userId === userId);
      return m?.name ?? m?.email ?? "Unknown";
    },
    [members],
  );

  const ownerOf = useCallback(
    (userId: string | null) => {
      if (!userId) return null;
      const m = members.find((row) => row.userId === userId);
      return m ? { name: m.name ?? undefined, email: m.email } : null;
    },
    [members],
  );

  const handleDecideClick = useCallback((item: ApprovalInboxItem) => {
    if (item.projectId === null) return;
    setReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setQueueTarget({
      approvalId: item.id,
      projectId: item.projectId,
      title: item.title,
      revision: item.revision,
    });
    const next = new URLSearchParams(searchParams.toString());
    next.set("projectId", String(item.projectId));
    next.set("approvalId", String(item.id));
    router.push(`${pathname}?${next}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDecideDialogChange = useCallback((open: boolean) => {
    if (open) return;
    setQueueTarget(null);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("approvalId");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
  const handleReturnFocus = useCallback(() => {
    const target = returnFocus?.isConnected ? returnFocus : searchInputRef.current;
    target?.focus({ preventScroll: true });
  }, [returnFocus]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleTypeChange = useCallback(
    (value: string) => listFilters.setValue("type", value),
    [listFilters],
  );

  const handleDateRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      listFilters.setValue("from", range.from);
      listFilters.setValue("to", range.to);
    },
    [listFilters],
  );

  const handleClearSelection = useCallback(() => setSelection(new Set()), []);
  const isRowSelectable = useCallback(() => canManage, [canManage]);

  const handleNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage]);

  const handleBulkCancel = useCallback(() => {
    if (isBulkPending || !canManage) return;
    const owner = updateApproval.captureOwner();
    if (!owner) return;
    const selectedItems = items.filter((item) =>
      item.projectId !== null && selection.has(`${item.projectId}-${item.id}`),
    );
    if (selectedItems.length === 0) return;
    setIsBulkPending(true);
    Promise.allSettled(
      selectedItems.map((item) =>
        updateApproval.mutateAsync({ projectId: item.projectId ?? 0, approvalId: item.id,
          expectedRevision: item.revision, status: "cancelled" }),
      ),
    ).then((results) => {
      if (!owner.isCurrent()) return;
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.length - succeeded;
      if (succeeded > 0) {
        toast.success(`${succeeded} approval${succeeded === 1 ? "" : "s"} cancelled`);
        setSelection((current) => {
          const next = new Set(current);
          selectedItems.forEach((item, index) => { if (results[index]?.status === "fulfilled") next.delete(`${item.projectId}-${item.id}`); });
          return next;
        });
      }
      if (failed > 0) toast.error(`${failed} could not be cancelled — try again`);
    }).finally(() => setIsBulkPending(false));
  }, [items, selection, updateApproval, isBulkPending, canManage]);

  const columns = useMemo(
    () =>
      buildApprovalsInboxColumns({
        canDecide,
        memberName,
        onDecide: handleDecideClick,
      }),
    [canDecide, memberName, handleDecideClick],
  );

  const renderMobileCard = useCallback(
    (row: ApprovalInboxItem) => (
      <ApprovalsInboxMobileCard row={row} ownerOf={ownerOf} />
    ),
    [ownerOf],
  );

  const handleKeyboardOpen = useCallback(
    (index: number) => {
      const item = filteredItems[index];
      if (item && canDecide) handleDecideClick(item);
    },
    [filteredItems, canDecide, handleDecideClick],
  );

  const handleKeyboardClear = useCallback(() => {
    handleDecideDialogChange(false);
  }, [handleDecideDialogChange]);

  useBuildListKeyboard({
    itemCount: filteredItems.length,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
    enabled: !isLoading && !decideTarget,
  });

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Approvals waiting for your decision across all projects"
      filters={
        <BuildListToolbar
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusFilter}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "type",
              label: "Type",
              active: listFilters.isActive("type"),
              control: (
                <BuildFilterSelect
                  label="Type"
                  value={typeFilter}
                  onValueChange={handleTypeChange}
                  options={ENTITY_OPTIONS}
                />
              ),
            },
            {
              id: "dateRange",
              label: "Date",
              active: listFilters.isActive("from") || listFilters.isActive("to"),
              control: (
                <DateRangePicker
                  from={fromFilter || undefined}
                  to={toFilter || undefined}
                  onChange={handleDateRangeChange}
                />
              ),
            },
          ]}
          search={{ value: searchDisplay, onValueChange: listFilters.setSearch, placeholder: "Search approvals…", inputRef: searchInputRef }}
          onClearAll={listFilters.clearAll}
        />
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          {isLoading ? (
            <StatCardGridSkeleton cols={2} />
          ) : (
            <StatCardGrid cols={2}>
              <StatCard
                label="Pending"
                value={pending}
                icon={ListChecks}
                tone="amber"
                index={0}
              />
              <StatCard
                label="Overdue"
                value={overdue}
                icon={Clock}
                tone="red"
                index={1}
              />
            </StatCardGrid>
          )}
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {!isOnline && (
            <p className="text-sm text-muted-foreground px-4 py-2 bg-muted/50 rounded-md mb-2">
              You&apos;re offline — results may not be up to date
            </p>
          )}
          {canManage && <ApprovalBulkActionBar
            selectedCount={selection.size}
            isPending={isBulkPending}
            onCancelSelected={handleBulkCancel}
            onClear={handleClearSelection}
          />}
          <BuildListSurface<ApprovalInboxItem>
            permission="build:approvals:view"
            rows={filteredItems}
            columns={columns}
            isLoading={isLoading}
            isError={isError}
            error={error}
            isFiltered={listFilters.isFiltered}
            getRowKey={(row) => `${row.projectId}-${row.id}`}
            minWidth="680px"
            mobileCard={renderMobileCard}
            loadingHeaders={INBOX_TABLE_HEADERS}
            loadingRows={12}
            selection={{
              selected: selection,
              onChange: setSelection,
              isRowSelectable,
              getRowLabel: (row) => row.title,
            }}
            pagination={{
              mode: "cursor",
              cursorVariant: "load-more",
              pageSize: 25,
              pageNumber: data?.pages.length ?? 1,
              hasMore: Boolean(hasNextPage),
              onNext: handleNextPage,
            }}
            isFetchingMore={isFetchingNextPage}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals waiting"
                description="You have no pending approvals across your projects."
              />
            }
            filteredEmpty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals match your filters"
                description="Try adjusting the filters to see more approvals."
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
          />
        </PmSection>
      </PmPageShell>

      <DecideDialog
        open={!!decideTarget}
        onOpenChange={handleDecideDialogChange}
        projectId={decideTarget?.projectId ?? 0}
        approvalId={decideTarget?.approvalId ?? 0}
        revision={queueTarget?.projectId === decideTarget?.projectId && queueTarget?.approvalId === decideTarget?.approvalId ? queueTarget?.revision : undefined}
        onCloseAutoFocus={handleReturnFocus}
      />
    </PageWrapper>
  );
}
