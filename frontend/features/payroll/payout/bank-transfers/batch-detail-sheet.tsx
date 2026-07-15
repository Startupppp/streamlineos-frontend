"use client";

import { useState, useMemo, useCallback } from "react";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { usePayoutBatch } from "@/hooks/api/payroll/payout-batches";
import { useOrgMembers } from "@/hooks/api/organization";
import { formatMoney } from "@/features/payroll/shared";
import { ItemActionDialog, RevealCell } from "./batch-item-actions";
import { cn } from "@/lib/utils";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";
import type { PayoutBatchItem, BankBatchStatus, BankItemStatus } from "@/types/payroll";

const ITEM_STATUS_STYLES: Record<BankItemStatus, string> = {
  PENDING: "bg-muted text-muted-foreground",
  SENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  HELD: "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300",
};

const BATCH_STATUS_STYLES: Record<BankBatchStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground",
  GENERATED: "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  SENT: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  PAID: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

interface BatchDetailSheetProps {
  batchId: number | null;
  onClose: () => void;
  canManage: boolean;
}

function buildColumns(
  canManage: boolean,
  onAction: (type: "paid" | "failed", item: PayoutBatchItem) => void,
  resolveMemberName: (userId: string) => string,
): DataTableColumn<PayoutBatchItem>[] {
  const cols: DataTableColumn<PayoutBatchItem>[] = [
    {
      key: "userId",
      header: "Employee",
      className: "max-w-[180px] truncate",
      cell: (row) => (
        <span className="font-medium text-foreground">{resolveMemberName(row.userId)}</span>
      ),
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
              className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
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
  const { data: membersData } = useOrgMembers(1, 200);
  const [actionDialog, setActionDialog] = useState<{
    type: "paid" | "failed";
    item: PayoutBatchItem;
  } | null>(null);

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : "Unknown";
    },
    [memberById],
  );

  const batch = data?.batch;
  const items = data?.items ?? [];

  function handleCloseActionDialog() {
    setActionDialog(null);
  }

  function handleAction(type: "paid" | "failed", item: PayoutBatchItem) {
    setActionDialog({ type, item });
  }

  const columns = useMemo(
    () => buildColumns(canManage, handleAction, resolveMemberName),
    [canManage, resolveMemberName],
  );

  return (
    <>
      <Sheet open={batchId !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-2xl">
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

          <SheetBody className="px-6 py-4">
            {isLoading ? (
              <DataTableSkeleton rows={8} columns={canManage ? 7 : 6} />
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
          </SheetBody>
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
