"use client";

import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { ApprovalStatusBadge, entityTypeLabel } from "./approval-status-badge";
import { ApprovalActions } from "./approvals-toolbar";
import { DECIDABLE } from "./approvals-constants";
import type { Approval, ApprovalStatus } from "@/types/projects";

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested",
  "pending",
  "approved",
  "rejected",
  "changes_requested",
  "escalated",
  "cancelled",
];

interface UseApprovalsColumnsParams {
  canDecide: boolean;
  canManage: boolean;
  memberName: (userId: string | null) => string;
  setDecideTarget: (row: Approval) => void;
  setDelegateTarget: (row: Approval) => void;
  handleEscalate: (row: Approval) => void;
  setCancelTarget: (row: Approval) => void;
  setDeleteTarget: (row: Approval) => void;
}

function ApprovalsActionsCell({
  row,
  canDecide,
  canManage,
  setDecideTarget,
  setDelegateTarget,
  handleEscalate,
  setCancelTarget,
  setDeleteTarget,
}: {
  row: Approval;
  canDecide: boolean;
  canManage: boolean;
  setDecideTarget: (r: Approval) => void;
  setDelegateTarget: (r: Approval) => void;
  handleEscalate: (r: Approval) => void;
  setCancelTarget: (r: Approval) => void;
  setDeleteTarget: (r: Approval) => void;
}) {
  const narrowStatus =
    APPROVAL_STATUS_VALUES.find((v) => v === row.status) ?? "pending";
  const canDecideRow = canDecide && DECIDABLE.has(narrowStatus) && canManage;

  const handleDecide = useCallback(
    () => setDecideTarget(row),
    [row, setDecideTarget],
  );
  const handleDelegate = useCallback(
    () => setDelegateTarget(row),
    [row, setDelegateTarget],
  );
  const handleEscalateRow = useCallback(
    () => handleEscalate(row),
    [row, handleEscalate],
  );
  const handleCancel = useCallback(
    () => setCancelTarget(row),
    [row, setCancelTarget],
  );
  const handleDelete = useCallback(
    () => setDeleteTarget(row),
    [row, setDeleteTarget],
  );

  return (
    <ApprovalActions
      canDecideRow={canDecideRow}
      canManage={canManage}
      status={narrowStatus}
      onDecide={handleDecide}
      onDelegate={handleDelegate}
      onEscalate={handleEscalateRow}
      onCancel={handleCancel}
      onDelete={handleDelete}
    />
  );
}

export function useApprovalsColumns({
  canDecide,
  canManage,
  memberName,
  setDecideTarget,
  setDelegateTarget,
  handleEscalate,
  setCancelTarget,
  setDeleteTarget,
}: UseApprovalsColumnsParams): DataTableColumn<Approval>[] {
  return useMemo<DataTableColumn<Approval>[]>(
    () => [
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
        sortable: true,
        sortValue: (row) => row.title,
      },
      {
        key: "approver",
        header: "Approver",
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
        key: "level",
        header: "Level",
        cell: (row) => (
          <span className="font-mono tabular-nums text-muted-foreground">
            {row.level}
          </span>
        ),
        className: "w-16",
      },
      {
        key: "dueAt",
        header: "Due",
        cell: (row) =>
          row.dueAt ? (
            <span className="tabular-nums text-muted-foreground">
              {row.dueAt.slice(0, 10)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        sortable: true,
        sortValue: (row) => row.dueAt ?? "",
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
        className: "w-10",
        cell: (row) => (
          <ApprovalsActionsCell
            row={row}
            canDecide={canDecide}
            canManage={canManage}
            setDecideTarget={setDecideTarget}
            setDelegateTarget={setDelegateTarget}
            handleEscalate={handleEscalate}
            setCancelTarget={setCancelTarget}
            setDeleteTarget={setDeleteTarget}
          />
        ),
      },
    ],
    [
      canDecide,
      canManage,
      memberName,
      handleEscalate,
      setDecideTarget,
      setDelegateTarget,
      setCancelTarget,
      setDeleteTarget,
    ],
  );
}
