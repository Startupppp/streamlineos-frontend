"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useApprovalInbox, useUpdateApproval } from "@/hooks/api/build/approvals";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { useOnlineStatus } from "@/hooks/common/use-online-status";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";
import { ENTITY_OPTIONS, STATUS_OPTIONS } from "./approvals-constants";
import type { ApprovalInboxItem } from "@/types/projects";
import {
  buildApprovalsInboxColumns,
  type DecideTarget,
} from "./approvals-inbox-columns";

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
  { param: "type", options: ENTITY_OPTIONS.map((o) => o.value) },
  { param: "from" },
  { param: "to" },
] as const;

export function useApprovalsInboxPage() {
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
    void Promise.allSettled(
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
          selectedItems.forEach((item, index) => {
            if (results[index]?.status === "fulfilled") next.delete(`${item.projectId}-${item.id}`);
          });
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

  return {
    canDecide,
    canManage,
    searchInputRef,
    isOnline,
    listFilters,
    statusFilter,
    typeFilter,
    fromFilter,
    toFilter,
    searchDisplay,
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    items,
    filteredItems,
    members,
    queueTarget,
    decideTarget,
    selection,
    setSelection,
    isBulkPending,
    pending,
    overdue,
    ownerOf,
    columns,
    handleDecideClick,
    handleRetry,
    handleDecideDialogChange,
    handleReturnFocus,
    handleStatusChange,
    handleTypeChange,
    handleDateRangeChange,
    handleClearSelection,
    isRowSelectable,
    handleNextPage,
    handleBulkCancel,
  };
}
