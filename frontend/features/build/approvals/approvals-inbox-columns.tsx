"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import type { NamedUser } from "@/lib/person-display";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import type { ApprovalInboxItem, ApprovalStatus } from "@/types/projects";

export const INBOX_TABLE_HEADERS = [
  "Project",
  "Type",
  "Title",
  "Requested By",
  "Due",
  "Status",
  "Actions",
] as const;

export const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
];

export interface DecideTarget {
  approvalId: number;
  projectId: number;
  title: string;
}

export function ProjectLinkCell({ row }: { row: ApprovalInboxItem }) {
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

export function DecideButtonCell({
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

interface ApprovalsInboxColumnsArgs {
  canDecide: boolean;
  memberName: (userId: string | null) => string;
  onDecide: (item: ApprovalInboxItem) => void;
}

export function buildApprovalsInboxColumns({
  canDecide,
  memberName,
  onDecide,
}: ApprovalsInboxColumnsArgs): DataTableColumn<ApprovalInboxItem>[] {
  return [
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
          <DecideButtonCell row={row} onDecide={onDecide} />
        ) : null,
      className: "w-20",
    },
  ];
}

export function ApprovalsInboxMobileCard({
  row,
  ownerOf,
}: {
  row: ApprovalInboxItem;
  ownerOf: (userId: string | null) => NamedUser | null;
}) {
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
}
