"use client";

import { useCallback, useMemo, useState } from "react";
import { Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useApprovalInbox, useDecideApproval } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  StatCard,
  StatCardGrid,
  StatCardGridSkeleton,
} from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DecideDialog } from "./decide-dialog";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { STATUS_OPTIONS } from "./approvals-constants";
import type { ApprovalInboxItem, DecideApprovalInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PmPageShell, PmSection, PM_FILL_PANEL } from "@/components/pm-chrome";
import {
  INBOX_TABLE_HEADERS,
  type DecideTarget,
  buildApprovalsInboxColumns,
  ApprovalsInboxMobileCard,
} from "./approvals-inbox-columns";

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
] as const;

export function ApprovalsInboxPage() {
  const canDecide = useCan("build:approvals:decide");

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: false,
  });

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useApprovalInbox();
  const items = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const [decideTarget, setDecideTarget] = useState<DecideTarget | null>(null);
  const decideApproval = useDecideApproval(decideTarget?.projectId ?? 0);

  const statusValue = listFilters.value("status");

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
    const all = items;
    if (statusValue === BUILD_FILTER_ALL) return all;
    return all.filter((a) => a.status === statusValue);
  }, [items, statusValue]);

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
    setDecideTarget({
      approvalId: item.id,
      projectId: item.projectId ?? 0,
      title: item.title,
    });
  }, []);

  const handleDecideConfirm = useCallback(
    (input: DecideApprovalInput) => {
      if (!decideTarget) return;
      decideApproval.mutate(
        { approvalId: decideTarget.approvalId, ...input },
        {
          onSuccess: () => {
            toast.success("Decision submitted");
            setDecideTarget(null);
          },
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    },
    [decideTarget, decideApproval],
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDecideDialogChange = useCallback((open: boolean) => {
    if (!open) setDecideTarget(null);
  }, []);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

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

  const pageState = usePageState({
    permission: "build:approvals:view",
    isLoading,
    isError,
    error,
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
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
          ]}
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
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton
                mobileCards
                rows={12}
                headers={INBOX_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals waiting"
                description="You have no pending approvals across your projects."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable
              data={filteredItems}
              columns={columns}
              getRowKey={(row) => `${row.projectId}-${row.id}`}
              pagination={{
                mode: "cursor",
                pageSize: 25,
                hasMore: Boolean(hasNextPage),
                hasPrevious: false,
                onNext: () => void fetchNextPage(),
              }}
              isLoading={isFetchingNextPage}
              minWidth="680px"
              mobileCard={renderMobileCard}
              className={PM_FILL_PANEL}
            />
          </PageState>
        </PmSection>
      </PmPageShell>

      <DecideDialog
        open={!!decideTarget}
        onOpenChange={handleDecideDialogChange}
        onConfirm={handleDecideConfirm}
        isPending={decideApproval.isPending}
        approvalTitle={decideTarget?.title}
      />
    </PageWrapper>
  );
}
