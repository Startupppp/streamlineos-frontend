"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LoadingState, ErrorState } from "@/components/shared";
import { useGoodsReceipt, useReverseGrn } from "@/hooks/api/inventory/operations";
import { GRN_QUALITY_BADGE, GRN_QUALITY_LABEL } from "@/features/inventory/lib";
import { TruncatedText } from "@/components/ui/truncated-text";

export interface GrnDetailSheetProps {
  grnId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GrnLine = ReturnType<typeof useGoodsReceipt>["data"] extends infer D
  ? D extends { lines: Array<infer L> }
    ? L
    : never
  : never;

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

const grnLineColumns: DataTableColumn<GrnLine>[] = [
  {
    key: "product",
    header: "Product",
    cell: (line) => String(line.poLineId),
  },
  {
    key: "qty",
    header: "Qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (line) => Number(line.quantityReceived).toFixed(2),
  },
  {
    key: "quality",
    header: "Quality",
    cell: (line) => (
      <>
        <Badge
          variant="outline"
          className={cn(
            "h-4 text-[9px] px-1.5 py-0",
            GRN_QUALITY_BADGE[line.qualityStatus],
          )}
        >
          {GRN_QUALITY_LABEL[line.qualityStatus]}
        </Badge>
        {line.rejectionReason && (
          <TruncatedText text={line.rejectionReason} lines={2} className="text-[10px] text-muted-foreground mt-0.5" />
        )}
      </>
    ),
  },
  {
    key: "lotSerial",
    header: "Lot / Serial",
    className: "font-mono",
    cell: (line) => {
      if (line.lotNumber) {
        return (
          <div>
            <span className="text-muted-foreground text-[10px]">LOT:</span>{" "}
            {line.lotNumber}
            {line.expiryDate && (
              <div className="text-[10px] text-muted-foreground">
                Exp: {formatDate(line.expiryDate)}
              </div>
            )}
          </div>
        );
      }
      if (line.serialNumbers && line.serialNumbers.length > 0) {
        return (
          <div>
            <span className="text-muted-foreground text-[10px]">S/N:</span>{" "}
            {line.serialNumbers.slice(0, 3).join(", ")}
            {line.serialNumbers.length > 3 && (
              <span className="text-muted-foreground">
                {" "}+{line.serialNumbers.length - 3} more
              </span>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
];

export function GrnDetailSheet({ grnId, open, onOpenChange }: GrnDetailSheetProps) {
  const grnQuery = useGoodsReceipt(open ? grnId : 0);
  const reverseMutation = useReverseGrn();
  const [reverseOpen, setReverseOpen] = useState<boolean>(false);
  const [reverseReason, setReverseReason] = useState<string>("");

  function handleOpenReverseDialog(): void {
    setReverseReason("");
    setReverseOpen(true);
  }

  function handleCloseReverseDialog(): void {
    setReverseOpen(false);
    setReverseReason("");
  }

  function handleReverseReasonChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setReverseReason(e.target.value);
  }

  function handleConfirmReverse(): void {
    if (!reverseReason.trim()) {
      toast.error("Reversal reason is required");
      return;
    }
    reverseMutation.mutate(
      { grnId, reason: reverseReason.trim() },
      {
        onSuccess: () => {
          toast.success("GRN reversed");
          setReverseOpen(false);
          onOpenChange(false);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const grn = grnQuery.data;

  return (
    <>
      <AppSheet
        open={open}
        onOpenChange={onOpenChange}
        title={grn ? `GRN ${grn.grnNumber}` : "Goods Receipt Note"}
        description={grn ? `Received on ${formatDate(grn.receivedDate)}` : undefined}
        footer={
          grn ? (
            <div className="w-full">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenReverseDialog}
                disabled={reverseMutation.isPending}
              >
                Reverse GRN
              </Button>
            </div>
          ) : undefined
        }
      >
        {grnQuery.isLoading && <LoadingState variant="form" />}
        {grnQuery.error && (
          <ErrorState description={grnQuery.error.message} onRetry={() => void grnQuery.refetch()} />
        )}
        {grn && (
          <div className="space-y-4">
            <Card className="p-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-muted-foreground">GRN Number</dt>
                <dd className="font-mono">{grn.grnNumber}</dd>
                <dt className="text-muted-foreground">Received Date</dt>
                <dd className="font-mono tabular-nums">{formatDate(grn.receivedDate)}</dd>
                {grn.notes && (
                  <>
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="col-span-1">{grn.notes}</dd>
                  </>
                )}
              </dl>
            </Card>

            <div className="space-y-1.5">
              <DataTable
                data={grn.lines}
                columns={grnLineColumns}
                getRowKey={(line) => line.id}
                minWidth="480px"
              />
            </div>
          </div>
        )}
      </AppSheet>

      <AlertDialog open={reverseOpen} onOpenChange={setReverseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse GRN?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse all stock movements from this receipt. Provide a reason below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2 space-y-1.5">
            <Label htmlFor="reverse-reason" className="text-sm">
              Reason *
            </Label>
            <Input
              id="reverse-reason"
              value={reverseReason}
              onChange={handleReverseReasonChange}
              placeholder="e.g. Wrong items received"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCloseReverseDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReverse}
              disabled={reverseMutation.isPending || !reverseReason.trim()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {reverseMutation.isPending ? "Reversing…" : "Reverse GRN"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
