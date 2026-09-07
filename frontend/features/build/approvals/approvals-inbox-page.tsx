"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useApprovalInbox, useDecideApproval } from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { DecideDialog } from "./decide-dialog";
import type { ApprovalInboxItem, ApprovalStatus, DecideApprovalInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

interface DecideTarget {
  approvalId: number;
  projectId: number;
  title: string;
}

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = ["requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled"];

export function ApprovalsInboxPage() {
  const canDecide = useCan("build:approvals:decide");

  const { data, isLoading, isError, refetch } = useApprovalInbox();
  const { data: membersRes } = useOrgMembers(1, 100);
  const members = useMemo(() => membersRes?.data ?? [], [membersRes]);

  const [decideTarget, setDecideTarget] = useState<DecideTarget | null>(null);
  const decideApproval = useDecideApproval(decideTarget?.projectId ?? 0);

  const pending = useMemo(
    () => (data ?? []).filter((a) => a.status === "pending" || a.status === "requested").length,
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

  const memberName = useCallback((userId: string | null): string => {
    if (!userId) return "—";
    const m = members.find((row) => row.userId === userId);
    return m?.name ?? m?.email ?? "Unknown";
  }, [members]);

  const handleDecideClick = useCallback((item: ApprovalInboxItem) => {
    setDecideTarget({ approvalId: item.id, projectId: item.projectId ?? 0, title: item.title });
  }, []);

  const handleDecideConfirm = useCallback((input: DecideApprovalInput) => {
    if (!decideTarget) return;
    decideApproval.mutate(
      { id: decideTarget.approvalId, ...input },
      {
        onSuccess: () => {
          toast.success("Decision submitted");
          setDecideTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [decideTarget, decideApproval]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleDecideDialogChange = useCallback((open: boolean) => {
    if (!open) setDecideTarget(null);
  }, []);

  const columns = useMemo<DataTableColumn<ApprovalInboxItem>[]>(() => [
    {
      key: "project",
      header: "Project",
      cell: (row) => (
        <Link
          href={`/build/${row.projectId}`}
          className="max-w-[6rem] text-dense font-medium text-primary hover:underline min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <TruncatedText text={row.projectKey ?? "—"} />
        </Link>
      ),
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
        <TruncatedText text={row.title} className="font-medium text-foreground" />
      ),
      sortable: true,
      sortValue: (row) => row.title,
    },
    {
      key: "requester",
      header: "Requested By",
      cell: (row) => {
        const name = memberName(row.requestedById);
        return (
          <TruncatedText text={name} className="max-w-[8rem] text-muted-foreground" />
        );
      },
    },
    {
      key: "dueAt",
      header: "Due",
      cell: (row) => {
        if (!row.dueAt) return <span className="text-muted-foreground">—</span>;
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
      sortable: true,
      sortValue: (row) => row.dueAt ?? "",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const s = APPROVAL_STATUS_VALUES.find((v) => v === row.status) ?? "pending";
        return <ApprovalStatusBadge status={s} />;
      },
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canDecide ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-dense"
            onClick={(e) => {
              e.stopPropagation();
              handleDecideClick(row);
            }}
          >
            Decide
          </Button>
        ) : null,
      className: "w-20",
    },
  ], [canDecide, memberName, handleDecideClick]);

  if (isLoading) {
    return (
      <PageWrapper title="Approvals" subtitle="Approvals waiting for your decision across all projects">
        <PmPageShell>
          <StatCardGridSkeleton cols={2} />
          <Skeleton className="h-48 w-full rounded-xl" />
        </PmPageShell>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Approvals" subtitle="Approvals waiting for your decision across all projects">
        <PmPageShell withGlow={false}>
          <ErrorState onRetry={handleRetry} />
        </PmPageShell>
      </PageWrapper>
    );
  }

  const items = data ?? [];

  return (
    <PageWrapper
      title="Approvals"
      subtitle="Approvals waiting for your decision across all projects"
    >
      <PmPageShell>
        <PmSection index={0}>
          <StatCardGrid cols={2}>
            <StatCard label="Pending" value={pending} icon={ListChecks} tone="amber" index={0} />
            <StatCard label="Overdue" value={overdue} icon={Clock} tone="red" index={1} />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {items.length === 0 ? (
            <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="approval"
                title="No approvals waiting"
                description="You have no pending approvals across your projects."
              />
          ) : (
            <DataTable
                data={items}
                columns={columns}
                getRowKey={(row) => `${row.projectId}-${row.id}`}
                pagination={{ pageSize: 25 }}
                minWidth="680px"
                className={PM_FILL_PANEL}
              />
          )}
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
