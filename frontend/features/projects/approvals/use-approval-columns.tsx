"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import type { Approval, ApprovalStatus } from "@/types/projects";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { ApprovalActions } from "./approval-actions";
import { TABLE_TITLE_CELL } from "@/features/projects/shared/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";

const DECIDABLE = new Set<ApprovalStatus>(["pending", "requested", "escalated", "changes_requested"]);

interface UseApprovalColumnsOptions {
  canDecide: boolean;
  canManage: boolean;
  memberName: (userId: string | null) => string;
  onDecide: (row: Approval) => void;
  onDelegate: (row: Approval) => void;
  onEscalate: (row: Approval) => void;
  onCancel: (row: Approval) => void;
  onDelete: (row: Approval) => void;
}

export function useApprovalColumns({
  canDecide,
  canManage,
  memberName,
  onDecide,
  onDelegate,
  onEscalate,
  onCancel,
  onDelete,
}: UseApprovalColumnsOptions): DataTableColumn<Approval>[] {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  return useMemo<DataTableColumn<Approval>[]>(
    () => [
      {
        key: "entityType",
        header: "Type",
        cell: (row) => (
          <Badge variant="outline" className="px-1.5 py-0.5 text-[10px]">
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
        key: "approver",
        header: "Approver",
        cell: (row) => {
          const name = memberName(row.approverId);
          return (
            <TruncatedText text={name} className="max-w-[8rem] text-muted-foreground" />
          );
        },
      },
      {
        key: "level",
        header: "Level",
        cell: (row) => (
          <span className="font-mono tabular-nums text-muted-foreground">{row.level}</span>
        ),
        className: "w-16",
      },
      {
        key: "dueAt",
        header: "Due",
        cell: (row) =>
          row.dueAt ? (
            <span className="tabular-nums text-muted-foreground">{row.dueAt.slice(0, 10)}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
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
        className: "w-10",
        cell: (row) => {
          const canDecideRow =
            canDecide &&
            DECIDABLE.has(row.status) &&
            (canManage || row.approverId === currentUserId);
          return (
            <ApprovalActions
              canDecideRow={canDecideRow}
              canManage={canManage}
              decidable={DECIDABLE.has(row.status)}
              isEscalated={row.status === "escalated"}
              onDecide={() => onDecide(row)}
              onDelegate={() => onDelegate(row)}
              onEscalate={() => onEscalate(row)}
              onCancel={() => onCancel(row)}
              onDelete={() => onDelete(row)}
            />
          );
        },
      },
    ],
    [canDecide, canManage, currentUserId, memberName, onDecide, onDelegate, onEscalate, onCancel, onDelete],
  );
}
