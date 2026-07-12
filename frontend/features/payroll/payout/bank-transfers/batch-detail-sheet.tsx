"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { usePayoutBatch } from "@/hooks/api/payroll/payout-batches";
import { formatMoney } from "@/features/payroll/shared";
import { ItemActionDialog, RevealCell } from "./batch-item-actions";
import { cn } from "@/lib/utils";
import type { PayoutBatchItem, BankBatchStatus, BankItemStatus } from "@/types/payroll";

const ITEM_STATUS_STYLES: Record<BankItemStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  SENT: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
  HELD: "bg-purple-100 text-purple-700",
};

const BATCH_STATUS_STYLES: Record<BankBatchStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  GENERATED: "bg-blue-100 text-blue-700",
  SENT: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-red-100 text-red-700",
};

interface BatchDetailSheetProps {
  batchId: number | null;
  onClose: () => void;
  canManage: boolean;
}

function buildColumns(
  canManage: boolean,
  onAction: (type: "paid" | "failed", item: PayoutBatchItem) => void,
): DataTableColumn<PayoutBatchItem>[] {
  const cols: DataTableColumn<PayoutBatchItem>[] = [
    {
      key: "userId",
      header: "Employee",
      className: "font-mono text-xs text-muted-foreground max-w-[120px] truncate",
      cell: (row) => row.userId,
    },
    {
      key: "account",
      header: "Account",
      cell: (row) =>
        canManage ? (
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
            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
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
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => onAction("paid", row)}
            >
              Mark Paid
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onAction("failed", row)}
            >
              Mark Failed
            </Button>
          </div>
        ) : null,
    });
  }

  return cols;
}

export function BatchDetailSheet({ batchId, onClose, canManage }: BatchDetailSheetProps) {
  const { data, isLoading } = usePayoutBatch(batchId ?? 0);
  const [actionDialog, setActionDialog] = useState<{
    type: "paid" | "failed";
    item: PayoutBatchItem;
  } | null>(null);

  const batch = data?.batch;
  const items = data?.items ?? [];

  function handleCloseActionDialog() {
    setActionDialog(null);
  }

  function handleAction(type: "paid" | "failed", item: PayoutBatchItem) {
    setActionDialog({ type, item });
  }

  const columns = buildColumns(canManage, handleAction);

  return (
    <>
      <Sheet open={batchId !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-2xl">
          <div className="shrink-0 px-6 py-4 border-b">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {batch ? (
                  <>
                    <span>{batch.batchNumber}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        BATCH_STATUS_STYLES[batch.status],
                      )}
                    >
                      {batch.status.replace("_", " ")}
                    </span>
                  </>
                ) : (
                  "Batch Details"
                )}
              </SheetTitle>
            </SheetHeader>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <DataTableSkeleton rows={5} columns={canManage ? 7 : 6} />
            ) : (
              <DataTable
                data={items}
                columns={columns}
                getRowKey={(row) => row.id}
                emptyState={
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No items in this batch
                  </div>
                }
                minWidth="640px"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {actionDialog !== null && batch !== undefined && (
        <ItemActionDialog
          type={actionDialog.type}
          item={actionDialog.item}
          batchId={batch.id}
          runId={batch.runId}
          onClose={handleCloseActionDialog}
        />
      )}
    </>
  );
}
