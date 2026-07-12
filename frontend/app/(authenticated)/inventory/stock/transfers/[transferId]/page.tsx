"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ArrowRight, Package } from "lucide-react";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState } from "@/components/shared/error-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import Link from "next/link";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useTransfer,
  useCompleteTransfer,
  useDispatchTransfer,
  useReserveTransfer,
  useCancelTransfer,
} from "@/hooks/api/inventory/stock";
import { ReceiveTransferSheet } from "@/features/inventory/components/receive-transfer-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  TRANSFER_STATUS_BADGE,
  TRANSFER_STATUS_LABEL,
} from "@/features/inventory/lib";
import { StatusTimeline, LocationCell } from "@/features/inventory/components/stock/transfer-detail-widgets";
import { cn } from "@/lib/utils";

function TransferDetailSkeleton() {
  return (
    <PageWrapper title="Transfer" eyebrow="Inventory / Transfers">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-7 w-7 rounded-full" />)}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

export default function TransferDetailPage({
  params,
}: {
  params: Promise<{ transferId: string }>;
}) {
  const { transferId: transferIdStr } = use(params);
  const transferId = Number(transferIdStr);
  const [receiveOpen, setReceiveOpen] = useState(false);

  const { data: transferData, isLoading, isError, refetch } = useTransfer(transferId);
  const completeMutation = useCompleteTransfer();
  const dispatchMutation = useDispatchTransfer();
  const reserveMutation = useReserveTransfer();
  const cancelMutation = useCancelTransfer();

  const transfer = transferData ?? undefined;

  function handleRetry() {
    void refetch();
  }

  function handleReserve() {
    reserveMutation.mutate(transferId, {
      onSuccess: () => toast.success("Transfer reserved"),
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    });
  }

  function handleDispatch() {
    dispatchMutation.mutate(
      { transferId },
      {
        onSuccess: () => toast.success("Transfer dispatched"),
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }

  function handleOpenReceiveSheet() {
    setReceiveOpen(true);
  }

  function handleCancelTransfer() {
    cancelMutation.mutate(transferId, {
      onSuccess: () => toast.success("Transfer cancelled"),
      onError: (err: unknown) => toast.error(getErrorMessage(err)),
    });
  }

  function handleCompleteReceive(
    lines: { transferLineId: number; quantityReceived: number }[],
  ) {
    completeMutation.mutate(
      { transferId, lines },
      {
        onSuccess: () => {
          toast.success("Transfer completed");
          setReceiveOpen(false);
        },
        onError: (err: unknown) => toast.error(getErrorMessage(err)),
      },
    );
  }

  if (isLoading) return <TransferDetailSkeleton />;

  if (isError)
    return (
      <PageWrapper
        title="Transfer"
        eyebrow="Inventory / Transfers"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock/transfers">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Transfers
            </Link>
          </Button>
        }
      >
        <ErrorState
          title="Failed to load transfer"
          description="An error occurred while fetching this transfer. Please try again."
          onRetry={handleRetry}
          className="flex-1 min-h-[40vh]"
        />
      </PageWrapper>
    );

  if (!transfer)
    return (
      <PageWrapper
        title="Transfer not found"
        eyebrow="Inventory / Transfers"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock/transfers">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Transfers
            </Link>
          </Button>
        }
      >
        <InventoryEmptyState
          illustration={<EmptyTransferIllustration />}
          title="Transfer not found"
          description="This transfer does not exist or you do not have access."
          action={{ label: "Back to Transfers", href: "/inventory/stock/transfers" }}
          className="flex-1 min-h-[40vh]"
        />
      </PageWrapper>
    );

  const lines = transfer.lines ?? [];
  const isCompleted = transfer.status === "COMPLETED";
  const isCancellable = transfer.status === "PENDING" || transfer.status === "RESERVED";
  const anyMutationPending =
    reserveMutation.isPending ||
    dispatchMutation.isPending ||
    cancelMutation.isPending;

  return (
    <PageWrapper
      title={transfer.referenceNumber}
      eyebrow="Inventory / Transfers"
      subtitle={
        <Badge
          variant="outline"
          className={cn("h-5 text-[10px] px-2 py-0.5", TRANSFER_STATUS_BADGE[transfer.status])}
        >
          {TRANSFER_STATUS_LABEL[transfer.status]}
        </Badge>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
            <Link href="/inventory/stock/transfers">
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to Transfers
            </Link>
          </Button>
          {transfer.status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={handleReserve}
              disabled={anyMutationPending}
            >
              {reserveMutation.isPending ? "Reserving…" : "Reserve Transfer"}
            </Button>
          )}
          {transfer.status === "RESERVED" && (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={handleDispatch}
              disabled={anyMutationPending}
            >
              {dispatchMutation.isPending ? "Dispatching…" : "Dispatch Transfer"}
            </Button>
          )}
          {transfer.status === "IN_TRANSIT" && (
            <Button size="sm" className="h-8 text-xs" onClick={handleOpenReceiveSheet}>
              Receive Transfer
            </Button>
          )}
          {isCancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  disabled={anyMutationPending}
                >
                  Cancel Transfer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel transfer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelTransfer}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Cancel Transfer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      }
    >
      <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <StatusTimeline status={transfer.status} />
              <div className="mt-4 pt-4 border-t grid gap-6 sm:grid-cols-3">
                <LocationCell location={transfer.fromLocation} label="From" />
                <div className="flex items-center justify-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-px w-8 bg-border" />
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    <div className="h-px w-8 bg-border" />
                  </div>
                </div>
                <LocationCell location={transfer.toLocation} label="To" />
              </div>
              <div className="mt-4 pt-4 border-t grid gap-4 sm:grid-cols-3 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Created: </span>
                  {format(new Date(transfer.createdAt), "dd MMM yyyy, HH:mm")}
                </div>
                {transfer.completedAt && (
                  <div>
                    <span className="font-medium text-foreground">Completed: </span>
                    {format(new Date(transfer.completedAt), "dd MMM yyyy, HH:mm")}
                  </div>
                )}
                {transfer.createdByName && (
                  <div>
                    <span className="font-medium text-foreground">Created by: </span>
                    {transfer.createdByName}
                  </div>
                )}
                {transfer.notes && (
                  <div className="sm:col-span-3">
                    <span className="font-medium text-foreground">Notes: </span>
                    {transfer.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-sm font-semibold">Line Items</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  ({lines.length})
                </span>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {lines.length === 0 ? (
                <InventoryEmptyState
                  compact
                  title="No line items"
                  description="This transfer has no product lines."
                />
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/80 hover:bg-muted/80">
                        <TableHead className={TH}>Product</TableHead>
                        <TableHead className={TH}>SKU</TableHead>
                        <TableHead className={cn(TH, "text-right")}>Requested</TableHead>
                        {isCompleted && <TableHead className={cn(TH, "text-right")}>Received</TableHead>}
                        {isCompleted && <TableHead className={cn(TH, "text-right")}>Variance</TableHead>}
                        <TableHead className={TH}>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((line) => {
                        const variance = line.quantityReceived - line.quantity;
                        return (
                          <TableRow key={line.id} className="h-8 hover:bg-muted/30 transition-colors">
                            <TableCell className="px-2 py-1 text-[11px] font-medium max-w-[180px] truncate">
                              {line.productName}
                            </TableCell>
                            <TableCell className="px-2 py-1 font-mono text-[11px] text-muted-foreground">
                              {line.sku}
                            </TableCell>
                            <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                              {line.quantity.toLocaleString()}
                            </TableCell>
                            {isCompleted && (
                              <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                                {line.quantityReceived.toLocaleString()}
                              </TableCell>
                            )}
                            {isCompleted && (
                              <TableCell
                                className={cn(
                                  "px-2 py-1 text-right font-mono tabular-nums text-[11px] font-medium",
                                  variance < 0 && "text-red-600",
                                  variance > 0 && "text-amber-600",
                                  variance === 0 && "text-muted-foreground",
                                )}
                              >
                                {variance === 0
                                  ? "—"
                                  : `${variance > 0 ? "+" : ""}${variance.toLocaleString()}`}
                              </TableCell>
                            )}
                            <TableCell className="px-2 py-1 text-[11px] text-muted-foreground max-w-[160px] truncate">
                              {line.notes ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {transfer.status === "IN_TRANSIT" && (
        <ReceiveTransferSheet
          open={receiveOpen}
          onOpenChange={setReceiveOpen}
          transfer={transfer}
          onSubmit={handleCompleteReceive}
          isPending={completeMutation.isPending}
        />
      )}
    </PageWrapper>
  );
}
