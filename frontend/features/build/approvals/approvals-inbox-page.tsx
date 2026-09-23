"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useApprovalInbox, useDecideApproval } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { DecideDialog } from "./decide-dialog";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { STATUS_OPTIONS } from "./approvals-constants";
import type {
  ApprovalInboxItem,
  ApprovalStatus,
  DecideApprovalInput,
} from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

const INBOX_TABLE_HEADERS = [
  "Project",
  "Type",
  "Title",
  "Requested By",
  "Due",
  "Status",
  "Actions",
] as const;

const FILTER_DEFINITIONS = [
  { param: "status", options: STATUS_OPTIONS.map((o) => o.value) },
] as const;

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
];

interface DecideTarget {
  approvalId: number;
  projectId: number;
  title: string;
}

function ProjectLinkCell({ row }: { row: ApprovalInboxItem }) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);
  return (
    <Link
      href={`/build/${row.projectId}`}
      className="max-w-[6rem] text-dense font-medium text-primary hover:underline min-w-0"
      onClick={handleClick}
    >
      <TruncatedText text={row.projectKey ?? "—"} />
    </Link>
  );
}

function DecideButtonCell({
  row,
  onDecide,
}: {
  row: ApprovalInboxItem;
  onDecide: (item: ApprovalInboxItem) => void;
}) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDecide(row);
    },
    [row, onDecide],
  );
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-dense"
      onClick={handleClick}
    >
      Decide
    </Button>
  );
}

export function ApprovalsInboxPage() {
  const canDecide = useCan("build:approvals:decide");

  const listFilters = useBuildListFilters({
    filters: FILTER_DEFINITIONS,
    withSearch: false,
  });

  const { data, isLoading, isError, error, refetch } = useApprovalInbox();
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const [decideTarget, setDecideTarget] = useState<DecideTarget | null>(null);
  const decideApproval = useDecideApproval(decideTarget?.projectId ?? 0);

  const statusValue = listFilters.value("status");

  const pending = useMemo(
    () =>
      (data ?? []).filter(
        (a) => a.status === "pending" || a.status === "requested",
      ).length,
    [data],
  );
  const overdue = useMemo(() => {
    const now = new Date();
    return (data ?? []).filter(
      (a) =>
        a.dueAt &&
        new Date(a.dueAt) < now &&
        a.status !== "approved" &&
        a.status !== "rejected" &&
        a.status !== "cancelled",
    ).length;
  }, [data]);

  const filteredItems = useMemo(() => {
    const all = data ?? [];
    if (statusValue === BUILD_FILTER_ALL) return all;
    return all.filter((a) => a.status === statusValue);
  }, [data, statusValue]);

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

  const columns = useMemo<DataTableColumn<ApprovalInboxItem>[]>(
    () => [
      {
        key: "project",
        header: "Project",
        cell: (row) => <ProjectLinkCell row={row} />,
      },
      {
        key: "entityType",
        header: "Type",
        cell: (row) => (
          <Badge variant="outline" className="px-1.5 py-0.5 text-micro">
            {entityTypeLabel(row.entityType)}
          </Badge>
        ),
      },
      {
        key: "title",
        header: "Title",
        className: TABLE_TITLE_CELL,
        cell: (row) => (
          <TruncatedText
            text={row.title}
            className="font-medium text-foreground"
          />
        ),
      },
      {
        key: "requester",
        header: "Requested By",
        cell: (row) => {
          const name = memberName(row.requestedById);
          return (
            <TruncatedText
              text={name}
              className="max-w-[8rem] text-muted-foreground"
            />
          );
        },
      },
      {
        key: "dueAt",
        header: "Due",
        cell: (row) => {
          if (!row.dueAt)
            return <span className="text-muted-foreground">—</span>;
          const isOverdue = new Date(row.dueAt) < new Date();
          return (
            <span
              className={cn(
                "tabular-nums",
                isOverdue
                  ? "font-medium text-status-danger-ink"
                  : "text-muted-foreground",
              )}
            >
              {row.dueAt.slice(0, 10)}
            </span>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => {
          const s =
            APPROVAL_STATUS_VALUES.find((v) => v === row.status) ?? "pending";
          return <ApprovalStatusBadge status={s} />;
        },
      },
      {
        key: "actions",
        header: "Actions",
        headerClassName: "sr-only",
        cell: (row) =>
          canDecide ? (
            <DecideButtonCell row={row} onDecide={handleDecideClick} />
          ) : null,
        className: "w-20",
      },
    ],
    [canDecide, memberName, handleDecideClick],
  );

  const renderMobileCard = useCallback(
    (row: ApprovalInboxItem) => {
      const narrowStatus =
        APPROVAL_STATUS_VALUES.find((v) => v === row.status) ?? "pending";
      return (
        <BuildMobileCard
          eyebrow={row.projectKey ?? undefined}
          title={row.title}
          status={<ApprovalStatusBadge status={narrowStatus} />}
          person={{ user: ownerOf(row.requestedById), role: "Requested by" }}
          meta={[
            { label: "Type", value: entityTypeLabel(row.entityType) },
            {
              label: "Due",
              value: row.dueAt ? row.dueAt.slice(0, 10) : "—",
            },
          ]}
        />
      );
    },
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
              pagination={{ pageSize: 25 }}
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
