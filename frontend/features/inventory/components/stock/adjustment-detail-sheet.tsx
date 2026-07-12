"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useAdjustmentDetail,
  useApproveAdjustment,
  usePostAdjustment,
  useCancelAdjustment,
} from "@/hooks/api/inventory/stock";
import {
  ADJUSTMENT_STATUS_BADGE,
  ADJUSTMENT_STATUS_LABEL,
  type AdjustmentStatus,
} from "@/features/inventory/lib";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";

type AdjustmentLine = {
  id: number;
  productVariantId: number;
  locationId: number;
  variantName?: string | null;
  variantSku?: string | null;
  locationName?: string | null;
  quantityChange: number;
};

const lineColumns: DataTableColumn<AdjustmentLine>[] = [
  {
    key: "variant",
    header: "Variant",
    cell: (line) => (
      <>
        {line.variantName ?? `Variant #${line.productVariantId}`}
        {line.variantSku && (
          <span className="text-muted-foreground font-mono ml-1">({line.variantSku})</span>
        )}
      </>
    ),
  },
  {
    key: "location",
    header: "Location",
    className: "text-muted-foreground",
    cell: (line) => line.locationName ?? `Location #${line.locationId}`,
  },
  {
    key: "qtyChange",
    header: "Qty Change",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (line) => (
      <span className={cn(
        line.quantityChange > 0 && "text-emerald-600",
        line.quantityChange < 0 && "text-red-600",
      )}>
        {line.quantityChange > 0 ? `+${line.quantityChange}` : line.quantityChange}
      </span>
    ),
  },
];

interface AdjustmentDetailSheetProps {
  adjustmentId: number | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AdjustmentDetailSheet({ adjustmentId, open, onOpenChange }: AdjustmentDetailSheetProps) {
  const [confirmPost, setConfirmPost] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { data: detail, isLoading } = useAdjustmentDetail(adjustmentId ?? 0);
  const approveMutation = useApproveAdjustment();
  const postMutation = usePostAdjustment();
  const cancelMutation = useCancelAdjustment();
  const canAdjust = useCan("inventory:stock:adjust");

  const status: AdjustmentStatus | undefined = detail?.status;
  const isFinal = status === "POSTED" || status === "CANCELLED";
  const isPending = approveMutation.isPending || postMutation.isPending || cancelMutation.isPending;

  function handleApprove() {
    if (!detail) return;
    approveMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Adjustment approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handlePost() {
    if (!detail) return;
    setConfirmPost(false);
    postMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Adjustment posted — stock updated"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCancel() {
    if (!detail) return;
    setConfirmCancel(false);
    cancelMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Adjustment cancelled"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
        <SheetHeader className="shrink-0 px-6 py-4 border-b">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <SheetTitle className="font-mono text-base">
                  {detail?.referenceNumber ?? "—"}
                </SheetTitle>
                {status && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-5 text-[10px] px-2 py-0.5",
                      ADJUSTMENT_STATUS_BADGE[status],
                    )}
                  >
                    {ADJUSTMENT_STATUS_LABEL[status]}
                  </Badge>
                )}
              </div>
              <SheetDescription>
                {detail?.createdByName && `Created by ${detail.createdByName}`}
                {detail?.createdAt && ` · ${format(new Date(detail.createdAt), "dd MMM yyyy, HH:mm")}`}
              </SheetDescription>
            </>
          )}
        </SheetHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : detail ? (
            <>
              <DataTable
                data={detail.lines}
                columns={lineColumns}
                getRowKey={(line) => line.id}
              />
              {detail.notes && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Notes: </span>
                  {detail.notes}
                </div>
              )}
              {detail.approvedAt && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Approved: </span>
                  {format(new Date(detail.approvedAt), "dd MMM yyyy, HH:mm")}
                </div>
              )}
              {detail.postedAt && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Posted: </span>
                  {format(new Date(detail.postedAt), "dd MMM yyyy, HH:mm")}
                </div>
              )}
            </>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 px-6 py-4 border-t">
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-2">
              {canAdjust && status === "PENDING_APPROVAL" && (
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleApprove}
                  disabled={isPending}
                >
                  {approveMutation.isPending ? "Approving…" : "Approve"}
                </Button>
              )}
              {canAdjust && status === "APPROVED" && (
                <AlertDialog open={confirmPost} onOpenChange={setConfirmPost}>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs" disabled={isPending}>
                      Post to Stock
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Post adjustment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently update stock quantities. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Back</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePost}>
                        {postMutation.isPending ? "Posting…" : "Post Adjustment"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              {canAdjust && !isFinal && (
                <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive hover:text-destructive"
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel adjustment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Back</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancel}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Cancel Adjustment
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
