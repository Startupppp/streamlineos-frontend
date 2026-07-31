"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { ApprovalActions } from "./approvals-toolbar";
import { DECIDABLE } from "./approvals-constants";
import type { Approval } from "@/types/projects";

interface UseApprovalsColumnsParams {
  canDecide: boolean;
  canManage: boolean;
  currentUserId: string | undefined;
  memberName: (userId: string | null) => string;
  setDecideTarget: (row: Approval) => void;
  setDelegateTarget: (row: Approval) => void;
  handleEscalate: (row: Approval) => void;
  setCancelTarget: (row: Approval) => void;
  setDeleteTarget: (row: Approval) => void;
}

export function useApprovalsColumns({
  canDecide,
  canManage,
  currentUserId,
  memberName,
  setDecideTarget,
  setDelegateTarget,
  handleEscalate,
  setCancelTarget,
  setDeleteTarget,
}: UseApprovalsColumnsParams): DataTableColumn<Approval>[] {
  return useMemo<DataTableColumn<Approval>[]>(() => [
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
            status={row.status}
            onDecide={() => setDecideTarget(row)}
            onDelegate={() => setDelegateTarget(row)}
            onEscalate={() => handleEscalate(row)}
            onCancel={() => setCancelTarget(row)}
            onDelete={() => setDeleteTarget(row)}
          />
        );
      },
    },
  ], [canDecide, canManage, currentUserId, memberName, handleEscalate]);
}
