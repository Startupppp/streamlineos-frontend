"use client";

import { use, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Package } from "lucide-react";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { toast } from "sonner";
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

type TransferLine = {
  id: number;
  productName: string;
  sku: string;
  lotNumber?: string | null;
  serialNumber?: string | null;
  quantity: number;
  quantityReceived: number;
  notes?: string | null;
};

function buildLineColumns(isCompleted: boolean): DataTableColumn<TransferLine>[] {
  const cols: DataTableColumn<TransferLine>[] = [
    {
      key: "productName",
      header: "Product",
      className: "max-w-[180px] truncate font-medium",
      cell: (row) => <span>{row.productName}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      className: "font-mono text-muted-foreground",
      cell: (row) => <span>{row.sku}</span>,
    },
    {
      key: "tracking",
      header: "Lot / Serial",
      className: "font-mono text-muted-foreground",
      cell: (row) => {
        const label = row.lotNumber
          ? `Lot: ${row.lotNumber}`
          : row.serialNumber
          ? `S/N: ${row.serialNumber}`
          : "—";
        return <span>{label}</span>;
      },
    },
    {
      key: "quantity",
      header: "Requested",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.quantity.toLocaleString()}</span>,
    },
  ];

  if (isCompleted) {
    cols.push({
      key: "quantityReceived",
      header: "Received",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.quantityReceived.toLocaleString()}</span>,
    });
    cols.push({
      key: "variance",
      header: "Variance",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums font-medium",
      cell: (row) => {
        const variance = row.quantityReceived - row.quantity;
        return (
          <span
            className={cn(
              variance < 0 && "text-red-600",
              variance > 0 && "text-amber-600",
              variance === 0 && "text-muted-foreground",
            )}
          >
            {variance === 0
              ? "—"
              : `${variance > 0 ? "+" : ""}${variance.toLocaleString()}`}
          </span>
        );
      },
    });
  }

  cols.push({
    key: "notes",
    header: "Notes",
    className: "text-muted-foreground max-w-[160px] truncate",
    cell: (row) => <span>{row.notes ?? "—"}</span>,
  });

  return cols;
}

function TransferDetailSkeleton() {
  return (
    <PageWrapper title="Transfer" backHref="/inventory/stock/transfers" backLabel="Back to Transfers">
      <div className="flex flex-1 min-h-0 flex-col gap-4">
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
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
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

  function handleRetry(): void {
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

  const lines: TransferLine[] = transfer?.lines ?? [];
  const isCompleted = transfer?.status === "COMPLETED";
  const lineColumns = useMemo(() => buildLineColumns(isCompleted), [isCompleted]);

  if (isLoading) return <TransferDetailSkeleton />;

  if (isError)
    return (
      <PageWrapper
        title="Transfer"
        backHref="/inventory/stock/transfers"
        backLabel="Back to Transfers"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
        <ErrorState
          title="Failed to load transfer"
          description="An error occurred while fetching this transfer. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
        </div>
      </PageWrapper>
    );

  if (!transfer)
    return (
      <PageWrapper
        title="Transfer not found"
        backHref="/inventory/stock/transfers"
        backLabel="Back to Transfers"
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
        <InventoryEmptyState
          illustration={<EmptyTransferIllustration />}
          title="Transfer not found"
          description="This transfer does not exist or you do not have access."
          action={{ label: "Back to Transfers", href: "/inventory/stock/transfers" }}
          className="flex-1"
        />
        </div>
      </PageWrapper>
    );

  const isCancellable = transfer.status === "PENDING" || transfer.status === "RESERVED";
  const anyMutationPending =
    reserveMutation.isPending ||
    dispatchMutation.isPending ||
    cancelMutation.isPending;

  return (
    <PageWrapper
      title={transfer.referenceNumber}
      subtitle={
        <Badge
          variant="outline"
          className={cn("h-5 text-[10px] px-2 py-0.5", TRANSFER_STATUS_BADGE[transfer.status])}
        >
          {TRANSFER_STATUS_LABEL[transfer.status]}
        </Badge>
      }
      backHref="/inventory/stock/transfers"
      backLabel="Back to Transfers"
      actions={
        <div className="flex items-center gap-2">
          {transfer.status === "PENDING" && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleReserve}
              disabled={anyMutationPending}
            >
              {reserveMutation.isPending ? "Reserving…" : "Reserve Transfer"}
            </Button>
          )}
          {transfer.status === "RESERVED" && (
            <Button
              size="sm"
              className="text-xs"
              onClick={handleDispatch}
              disabled={anyMutationPending}
            >
              {dispatchMutation.isPending ? "Dispatching…" : "Dispatch Transfer"}
            </Button>
          )}
          {transfer.status === "IN_TRANSIT" && (
            <Button size="sm" className="text-xs" onClick={handleOpenReceiveSheet}>
              Receive Transfer
            </Button>
          )}
          {isCancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs text-destructive hover:text-destructive"
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
      <div className="flex flex-1 min-h-0 flex-col gap-4">
      <motion.div className="flex flex-col gap-4" variants={staggerContainer} initial="hidden" animate="visible">
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
                <DataTable
                  data={lines}
                  columns={lineColumns}
                  getRowKey={(row) => row.id}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      </div>

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
