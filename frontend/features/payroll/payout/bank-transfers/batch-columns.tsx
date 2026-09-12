"use client";

import { Button } from "@/components/ui/button";
import { type DataTableColumn } from "@/components/ui/data-table";
import { TruncatedText } from "@/components/ui/truncated-text";
import { RevealCell } from "./batch-item-actions";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/features/payroll/shared";
import type { BankBatchStatus, BankItemStatus } from "@/types/payroll";
import type { BatchItemRow } from "@/hooks/api/payroll/payout-schema";

export const ITEM_STATUS_STYLES: Record<BankItemStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SENT: "bg-status-warning-surface text-status-warning-ink",
  PAID: "bg-status-success-surface text-status-success-ink",
  FAILED: "bg-status-danger-surface text-status-danger-ink",
  HELD: "bg-status-info-surface text-status-info-ink",
};

export const BATCH_STATUS_STYLES: Record<BankBatchStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  GENERATED: "bg-status-info-surface text-status-info-ink",
  SENT: "bg-status-warning-surface text-status-warning-ink",
  PARTIALLY_PAID: "bg-status-warning-surface text-status-warning-ink",
  PAID: "bg-status-success-surface text-status-success-ink",
  FAILED: "bg-status-danger-surface text-status-danger-ink",
};

function BatchItemActionButtons({
  row,
  onAction,
}: {
  row: BatchItemRow;
  onAction: (type: "paid" | "failed", item: BatchItemRow) => void;
}) {
  function handleMarkPaid() {
    onAction("paid", row);
  }
  function handleMarkFailed() {
    onAction("failed", row);
  }
  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-micro px-2"
        onClick={handleMarkPaid}
      >
        Mark Paid
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-6 text-micro px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={handleMarkFailed}
      >
        Mark Failed
      </Button>
    </div>
  );
}

export function buildColumns(
  canManage: boolean,
  onAction: (type: "paid" | "failed", item: BatchItemRow) => void,
  resolveMemberName: (userId: string) => string,
): DataTableColumn<BatchItemRow>[] {
  const cols: DataTableColumn<BatchItemRow>[] = [
    {
      key: "userId",
      header: "Employee",
      className: "max-w-[180px]",
      cell: (row) => (
        <TruncatedText text={resolveMemberName(row.userId ?? "")} className="font-medium text-foreground" />
      ),
    },
    {
      key: "account",
      header: "Account",
      cell: (row) =>
        canManage && row.userId ? (
          <RevealCell userId={row.userId} masked={row.accountMasked} />
        ) : (
          <span className="font-mono text-xs text-muted-foreground">{row.accountMasked}</span>
        ),
    },
    {
      key: "ifsc",
      header: "IFSC",
      className: "text-xs text-muted-foreground",
      cell: (row) => row.ifsc ?? "—",
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      className: "text-xs font-medium tabular-nums text-right",
      cell: (row) => formatMoney(row.amount),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide",
            ITEM_STATUS_STYLES[row.status],
          )}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "transactionRef",
      header: "Txn Ref",
      className: "text-xs text-muted-foreground font-mono",
      cell: (row) => row.transactionRef ?? "—",
    },
  ];

  if (canManage) {
    cols.push({
      key: "actions",
      header: "Actions",
      cell: (row) =>
        row.status === "PENDING" || row.status === "SENT" ? (
          <BatchItemActionButtons row={row} onAction={onAction} />
        ) : null,
    });
  }

  return cols;
}
