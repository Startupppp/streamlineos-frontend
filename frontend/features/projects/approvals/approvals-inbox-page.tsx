"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import { Clock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { useApprovalInbox, useDecideApproval } from "@/hooks/api/projects";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { DecideDialog } from "./decide-dialog";
import type { ApprovalInboxItem, DecideApprovalInput } from "@/types/projects";
import { getErrorMessage } from "@/lib/get-error-message";

interface DecideTarget {
  approvalId: number;
  projectId: number;
  title: string;
}

export function ApprovalsInboxPage() {
  const canDecide = useCan("projects:approvals:decide");
  const prefersReduced = useReducedMotion();

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
    const m = members.find((m) => m.userId === userId);
    return m?.name ?? m?.email ?? userId;
  }, [members]);

  const handleDecideClick = useCallback((item: ApprovalInboxItem) => {
    setDecideTarget({ approvalId: item.id, projectId: item.projectId, title: item.title });
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

  const columns = useMemo<DataTableColumn<ApprovalInboxItem>[]>(() => [
    {
      key: "project",
      header: "Project",
      cell: (row) => (
        <Link
          href={`/projects/${row.projectId}`}
          className="text-blue-600 hover:underline font-medium text-[11px]"
          onClick={(e) => e.stopPropagation()}
        >
          {row.projectKey}
        </Link>
      ),
    },
    {
      key: "entityType",
      header: "Type",
      cell: (row) => (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
          {entityTypeLabel(row.entityType)}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => (
        <span className="font-medium text-foreground truncate max-w-[200px] block">
          {row.title}
        </span>
      ),
      sortable: true,
      sortValue: (row) => row.title,
    },
    {
      key: "requester",
      header: "Requested By",
      cell: (row) => (
        <span className="text-muted-foreground">{memberName(row.requestedById)}</span>
      ),
    },
    {
      key: "dueAt",
      header: "Due",
      cell: (row) => {
        if (!row.dueAt) return <span className="text-muted-foreground">—</span>;
        const isOverdue = new Date(row.dueAt) < new Date();
        return (
          <span className={isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
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
      cell: (row) => <ApprovalStatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (row) =>
        canDecide ? (
          <Button
            variant="outline"
            size="sm"
            className="h-6 text-[11px] px-2"
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

  const fadeVariant = prefersReduced
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.2 } };

  if (isLoading) {
    return (
      <PageWrapper title="Approvals Inbox" eyebrow="Projects" variant="display">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Approvals Inbox" eyebrow="Projects" variant="display">
        <ErrorState onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  const items = data ?? [];

  return (
    <PageWrapper
      title="Approvals Inbox"
      eyebrow="Projects"
      variant="display"
      subtitle="Approvals waiting for your decision across all projects"
    >
      <motion.div className="space-y-4" {...fadeVariant}>
        <StatCardGrid cols={2}>
          <StatCard label="Pending" value={pending} icon={ListChecks} tone="amber" />
          <StatCard label="Overdue" value={overdue} icon={Clock} tone="red" />
        </StatCardGrid>

        {items.length === 0 ? (
          <EmptyState
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
          />
        )}
      </motion.div>

      <DecideDialog
        open={!!decideTarget}
        onOpenChange={(open) => { if (!open) setDecideTarget(null); }}
        onConfirm={handleDecideConfirm}
        isPending={decideApproval.isPending}
        approvalTitle={decideTarget?.title}
      />
    </PageWrapper>
  );
}
