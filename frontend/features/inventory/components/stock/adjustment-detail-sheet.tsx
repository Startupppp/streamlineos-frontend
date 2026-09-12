"use client";

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
  SheetBody,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  isWriteOffReason,
  useAdjustmentDetail,
  useApproveAdjustment,
  usePostAdjustment,
  useCancelAdjustment,
} from "@/hooks/api/inventory/stock";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney } from "@/lib/format-utils";
import {
  ADJUSTMENT_STATUS_BADGE,
  ADJUSTMENT_STATUS_LABEL,
  type AdjustmentStatus,
} from "@/features/inventory/lib";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { TruncatedText } from "@/components/ui/truncated-text";
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
      <div>
        <TruncatedText text={line.variantName ?? `Variant #${line.productVariantId}`} className="text-sm font-medium" />
        {line.variantSku && (
          <span className="text-muted-foreground font-mono text-xs break-all">({line.variantSku})</span>
        )}
      </div>
    ),
  },
  {
    key: "location",
    header: "Location",
    className: "text-muted-foreground",
    cell: (line) => <TruncatedText text={line.locationName ?? `Location #${line.locationId}`} className="text-sm text-muted-foreground" />,
  },
  {
    key: "qtyChange",
    header: "Qty Change",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (line) => (
      <span className={cn(
        line.quantityChange > 0 && "text-status-success-ink",
        line.quantityChange < 0 && "text-status-danger-ink",
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
  const { data: detail, isLoading } = useAdjustmentDetail(adjustmentId ?? 0);
  const approveMutation = useApproveAdjustment();
  const postMutation = usePostAdjustment();
  const cancelMutation = useCancelAdjustment();
  const canAdjust = useCan("inventory:stock:adjust");
  const canApprove = useCan("inventory:adjustments:approve");
  const canPost = useCan("inventory:adjustments:post");
  const canSeeCost = useCan("inventory:valuation:read");
  const moneyDisplay = useOrgDisplay();

  const status: AdjustmentStatus | undefined = detail?.status;
  const writeOff = detail ? isWriteOffReason(detail.reason) : false;
  const isFinal = status === "POSTED" || status === "CANCELLED";

  function handleClose(): void {
    onOpenChange(false);
  }

  function handleApprove(): void {
    if (!detail) return;
    approveMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Adjustment approved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handlePost(): void {
    if (!detail) return;
    postMutation.mutate(detail.id, {
      onSuccess: () => toast.success("Adjustment posted — stock updated"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCancel(): void {
    if (!detail) return;
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
                      "h-5 text-micro px-2 py-0.5",
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

        <SheetBody className="space-y-4 px-6 py-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
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
              {writeOff && detail.scrapLocation && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Scrap location: </span>
                  {detail.scrapLocation.name} ({detail.scrapLocation.code})
                </div>
              )}
              {writeOff && canSeeCost && detail.writtenOffValue != null && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Value written off: </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatMoney(detail.writtenOffValue, moneyDisplay)}
                  </span>
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
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t">
          <div className="flex items-center gap-2 w-full justify-between">
            <div className="flex items-center gap-2">
              {canApprove && status === "PENDING_APPROVAL" && (
                <LoadingButton
                  size="sm"
                  className="text-xs"
                  onClick={handleApprove}
                  isPending={approveMutation.isPending}
                  loadingText="Approving…"
                >
                  Approve
                </LoadingButton>
              )}
              {canPost && status === "APPROVED" && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" className="text-xs">
                      {writeOff ? "Write off stock" : "Post to stock"}
                    </Button>
                  }
                  destructive
                  title={writeOff ? "Write this stock off?" : "Post adjustment?"}
                  description={
                    writeOff
                      ? "The goods leave inventory and their cost is written off against the layers they came from. This cannot be undone."
                      : "This will permanently update stock quantities. This action cannot be undone."
                  }
                  confirmLabel={writeOff ? "Write off" : "Post adjustment"}
                  isPending={postMutation.isPending}
                  onConfirm={handlePost}
                />
              )}
              {canAdjust && !isFinal && (
                <ConfirmDialog
                  trigger={
                    <Button size="sm" variant="outline" className="text-xs">
                      Cancel
                    </Button>
                  }
                  destructive
                  title="Cancel adjustment?"
                  description="The document is closed without moving any stock. This action cannot be undone."
                  confirmLabel="Cancel adjustment"
                  cancelLabel="Back"
                  isPending={cancelMutation.isPending}
                  onConfirm={handleCancel}
                />
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={handleClose}
            >
              Close
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
