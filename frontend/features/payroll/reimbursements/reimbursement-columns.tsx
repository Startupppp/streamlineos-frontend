"use client";

import { memo } from "react";
import type { DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { formatShortDate } from "@/lib/date-utils";
import { ApprovalActions } from "@/components/approval-actions/approval-actions";
import type { Reimbursement } from "@/hooks/api/hr/reimbursements";
import { ReimbursementStatusBadge } from "./reimbursement-status-badge";

interface PendingActionsProps {
  claimId: number;
  isProcessing: boolean;
  onApprove: (claimId: number) => void;
  onReject: (claimId: number, reason: string) => void;
}

const PendingActions = memo(function PendingActions({
  claimId,
  isProcessing,
  onApprove,
  onReject,
}: PendingActionsProps) {
  function handleApprove() {
    onApprove(claimId);
  }
  function handleReject(reason: string) {
    onReject(claimId, reason);
  }
  return (
    <ApprovalActions
      onApprove={handleApprove}
      onReject={handleReject}
      isApproving={isProcessing}
      isRejecting={isProcessing}
      rejectTitle="Reject Claim"
      rejectDescription="Provide a reason for rejecting this reimbursement claim."
      approveLabel="Approve"
      rejectLabel="Reject Claim"
      size="sm"
      className="[&_button]:h-6 [&_button]:text-micro [&_button]:px-2"
    />
  );
});

interface BuildReimbursementColumnsOptions {
  canApprove: boolean;
  isProcessing: boolean;
  onApprove: (claimId: number) => void;
  onReject: (claimId: number, reason: string) => void;
}

export function buildReimbursementColumns({
  canApprove,
  isProcessing,
  onApprove,
  onReject,
}: BuildReimbursementColumnsOptions): DataTableColumn<Reimbursement>[] {
  const actionColumn: DataTableColumn<Reimbursement> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <PendingActions
          claimId={row.id}
          isProcessing={isProcessing}
          onApprove={onApprove}
          onReject={onReject}
        />
      ) : null,
  };

  return [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <TruncatedText text={row.user?.name ?? "—"} className="text-dense font-medium" />
          <TruncatedText text={row.user?.email ?? "Unknown user"} className="text-micro text-muted-foreground" />
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (row) => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-micro font-medium border bg-muted text-muted-foreground border-border">
          {row.category}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-dense tabular-nums">{formatMoney(row.amount)}</span>
      ),
    },
    {
      key: "receipt",
      header: "Receipt",
      cell: (row) =>
        row.receiptUrl ? (
          <a
            href={row.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="text-micro text-primary hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-micro text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <ReimbursementStatusBadge status={row.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-micro text-muted-foreground">{formatShortDate(row.createdAt)}</span>
      ),
    },
    ...(canApprove ? [actionColumn] : []),
  ];
}
