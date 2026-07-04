"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Employee
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Account
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        IFSC
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                        Txn Ref
                      </th>
                      {canManage && (
                        <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/40">
                        <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                          {item.userId}
                        </td>
                        <td className="py-2.5 px-3">
                          {canManage ? (
                            <RevealCell userId={item.userId} masked={item.accountMasked} />
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                              {item.accountMasked}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground">
                          {item.ifsc ?? "—"}
                        </td>
                        <td className="py-2.5 px-3 text-xs font-medium tabular-nums text-right">
                          {formatMoney(item.amount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              ITEM_STATUS_STYLES[item.status],
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">
                          {item.transactionRef ?? "—"}
                        </td>
                        {canManage && (
                          <td className="py-2.5 px-3">
                            {(item.status === "PENDING" || item.status === "SENT") && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2"
                                  onClick={() => setActionDialog({ type: "paid", item })}
                                >
                                  Mark Paid
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => setActionDialog({ type: "failed", item })}
                                >
                                  Mark Failed
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {items.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No items in this batch
                  </div>
                )}
              </div>
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
