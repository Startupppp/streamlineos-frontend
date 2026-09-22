"use client";

import { useState, useMemo, useCallback, useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/ui/loading-button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { usePayoutBatch, useImportBankReturn } from "@/hooks/api/payroll/payout-batches";
import { useOrgMembers } from "@/hooks/api/organization";
import { ItemActionDialog } from "./batch-item-actions";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import type { BatchItemRow } from "@/hooks/api/payroll/payout-schema";
import { buildColumns, BATCH_STATUS_STYLES } from "./batch-columns";

interface BatchDetailSheetProps {
  batchId: number | null;
  onClose: () => void;
  canManage: boolean;
}

export function BatchDetailSheet({ batchId, onClose, canManage }: BatchDetailSheetProps) {
  const { data, isLoading, isError, error, refetch } = usePayoutBatch(batchId ?? 0);
  const { data: membersData } = useOrgMembers(1, 200);
  const importReturn = useImportBankReturn();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [actionDialog, setActionDialog] = useState<{
    type: "paid" | "failed";
    item: BatchItemRow;
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
  const items = data?.items?.data ?? [];
  const hasMoreItems = data?.items?.hasMore ?? false;
  const canImportReturn =
    canManage &&
    batch != null &&
    (batch.status === "SENT" ||
      batch.status === "PARTIALLY_PAID" ||
      batch.status === "PAID");

  function handleCloseActionDialog() {
    setActionDialog(null);
  }

  const handleAction = useCallback((type: "paid" | "failed", item: BatchItemRow) => {
    setActionDialog({ type, item });
  }, []);

  function handleReturnFile(file: File | undefined) {
    if (!file || batchId == null || batch == null) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = typeof reader.result === "string" ? reader.result : "";
      if (!csv.trim()) {
        toast.error("Empty file");
        return;
      }
      importReturn.mutate(
        { batchId, csv, runId: batch.runId },
        {
          onSuccess: (res) => {
            toast.success(
              `Return imported: ${res.paid} paid, ${res.failed} failed, ${res.skipped} skipped`,
              { description: res.honestyNote },
            );
            if (res.parseErrors.length > 0) {
              toast.message(
                `${res.parseErrors.length} row warning(s)`,
                {
                  description: res.parseErrors
                    .slice(0, 3)
                    .map((e) => `L${e.line}: ${e.message}`)
                    .join("; "),
                },
              );
            }
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    };
    reader.onerror = () => toast.error("Failed to read file");
    reader.readAsText(file);
  }

  function handleReturnFileChange(event: ChangeEvent<HTMLInputElement>) {
    handleReturnFile(event.target.files?.[0]);
    event.target.value = "";
  }

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const columns = useMemo(
    () => buildColumns(canManage, handleAction, resolveMemberName),
    [canManage, handleAction, resolveMemberName],
  );
  const columnHeaders = columns.map((column) => column.header);

  return (
    <>
      <Sheet open={batchId !== null} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="p-0 flex flex-col gap-0 overflow-hidden sm:max-w-2xl">
          <div className="shrink-0 px-6 py-4 border-b space-y-2">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {batch ? (
                  <>
                    <span>{batch.batchNumber}</span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide",
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
            {canImportReturn && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-micro text-muted-foreground leading-snug max-w-md">
                  Import bank return CSV (itemId or userId, status, utr). Manual workflow — no bank
                  network connection.
                </p>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleReturnFileChange}
                  />
                  <LoadingButton
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    isPending={importReturn.isPending}
                    loadingText="Importing…"
                    onClick={handleImportClick}
                  >
                    <Upload className="mr-1 h-3.5 w-3.5" />
                    Import return CSV
                  </LoadingButton>
                </div>
              </div>
            )}
          </div>

          <SheetBody className="px-6 py-4">
            {isLoading ? (
              <DataTableSkeleton rows={8} headers={columnHeaders} />
            ) : isError ? (
              <ErrorState
                compact
                title="Couldn't load this batch"
                description={getErrorMessage(error)}
                onRetry={handleRetry}
              />
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
            {!isError && hasMoreItems ? (
              <p className="pt-3 text-sm text-muted-foreground">
                Showing the first {items.length} items in this batch. Download the batch file for
                the complete list.
              </p>
            ) : null}
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
