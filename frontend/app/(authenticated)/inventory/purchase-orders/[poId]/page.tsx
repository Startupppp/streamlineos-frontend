"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { PackageCheck, CheckCircle, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import {
  usePurchaseOrder,
  useSendPurchaseOrder,
  useApprovePurchaseOrder,
  useClosePurchaseOrder,
  useCancelPurchaseOrder,
} from "@/hooks/api/inventory";
import { ReceiveGoodsSheet } from "@/features/inventory/components/receive-goods-sheet";
import { GrnDetailSheet } from "@/features/inventory/components/procurement/grn-detail-sheet";
import { PoEditSheet } from "@/features/inventory/components/procurement/po-edit-sheet";
import { VendorAiActions } from "@/features/inventory/components/vendor-ai-actions";
import { PO_STATUS_BADGE, PO_STATUS_LABEL } from "@/features/inventory/lib";
import type { PurchaseOrderLine, PurchaseOrderStatus } from "@/types/inventory";

interface PoDetailPageProps {
  params: Promise<{ poId: string }>;
}

type ConfirmAction = "cancel" | "close";

type GrnRow = {
  id: number;
  grnNumber: string;
  receivedDate: string | null;
  creator?: { name: string } | null;
  notes?: string | null;
};

function formatAmount(value: string): string {
  return Number(value).toFixed(2);
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("h-4 text-micro px-1.5 py-0", PO_STATUS_BADGE[status])}>
      {PO_STATUS_LABEL[status]}
    </Badge>
  );
}

const PO_LINE_COLUMNS: DataTableColumn<PurchaseOrderLine>[] = [
  {
    key: "product",
    header: "Product",
    cell: (row) => (
      <span>{row.productVariant?.product?.name ?? row.productVariant?.name ?? "—"}</span>
    ),
  },
  {
    key: "sku",
    header: "SKU",
    className: "font-mono",
    cell: (row) => <span>{row.productVariant?.sku ?? "—"}</span>,
  },
  {
    key: "quantity",
    header: "Qty",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <span>{formatAmount(row.quantity)}</span>,
  },
  {
    key: "unitCost",
    header: "Unit cost",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => <span>{formatAmount(row.unitCost)}</span>,
  },
  {
    key: "quantityReceived",
    header: "Received",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums",
    cell: (row) => (
      <span
        className={
          Number(row.quantityReceived) >= Number(row.quantity)
            ? "text-status-success-ink font-medium"
            : Number(row.quantityReceived) > 0
              ? "text-status-warning-ink font-medium"
              : "text-muted-foreground"
        }
      >
        {formatAmount(row.quantityReceived)}
      </span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-medium",
    cell: (row) => <span>{formatAmount(row.amount)}</span>,
  },
];

function buildGrnColumns(onRowClick: (id: number) => void): DataTableColumn<GrnRow>[] {
  return [
    {
      key: "grnNumber",
      header: "GRN #",
      className: "font-mono text-primary",
      cell: (row) => (
        <button
          type="button"
          className="font-mono text-dense text-primary hover:underline"
          onClick={(e) => { e.stopPropagation(); onRowClick(row.id); }}
        >
          {row.grnNumber}
        </button>
      ),
    },
    {
      key: "receivedDate",
      header: "Received date",
      className: "font-mono tabular-nums",
      cell: (row) => <span>{formatShortDate(row.receivedDate) || "—"}</span>,
    },
    {
      key: "creator",
      header: "Received by",
      cell: (row) => <span>{row.creator?.name ?? "—"}</span>,
    },
    {
      key: "notes",
      header: "Notes",
      className: "text-muted-foreground",
      cell: (row) => <span>{row.notes ?? "—"}</span>,
    },
  ];
}

export default function PurchaseOrderDetailPage({ params }: PoDetailPageProps) {
  const { poId } = use(params);
  const id = Number(poId);
  const query = usePurchaseOrder(id);
  const sendMutation = useSendPurchaseOrder(id);
  const approveMutation = useApprovePurchaseOrder(id);
  const closeMutation = useClosePurchaseOrder(id);
  const cancelMutation = useCancelPurchaseOrder(id);

  const [receiveSheetOpen, setReceiveSheetOpen] = useState<boolean>(false);
  const [editSheetOpen, setEditSheetOpen] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [selectedGrnId, setSelectedGrnId] = useState<number | null>(null);

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSendPO(): void {
    sendMutation.mutate(undefined, {
      onSuccess: (result) => toast.success(`PO ${result.poNumber} sent`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleApprovePO(): void {
    approveMutation.mutate(undefined, {
      onSuccess: (result) => toast.success(`PO ${result.poNumber} approved`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleOpenReceive(): void {
    setReceiveSheetOpen(true);
  }

  function handleOpenEdit(): void {
    setEditSheetOpen(true);
  }

  function handleRequestCancel(): void {
    setConfirmAction("cancel");
  }

  function handleRequestClose(): void {
    setConfirmAction("close");
  }

  function handleDismissConfirm(): void {
    setConfirmAction(null);
  }

  function handleConfirmCancel(): void {
    cancelMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Purchase order cancelled");
        setConfirmAction(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleConfirmClose(): void {
    closeMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Purchase order closed");
        setConfirmAction(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleGrnRowClick(grnId: number): void {
    setSelectedGrnId(grnId);
  }

  function handleGrnDetailOpenChange(open: boolean): void {
    if (!open) setSelectedGrnId(null);
  }

  function handleCancelDialogOpenChange(open: boolean): void {
    if (!open) handleDismissConfirm();
  }

  function handleCloseDialogOpenChange(open: boolean): void {
    if (!open) handleDismissConfirm();
  }

  function handleGrnTableRowClick(row: GrnRow): void {
    handleGrnRowClick(row.id);
  }

  const grnColumns = useMemo(() => buildGrnColumns(handleGrnRowClick), []);

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />;
  if (!query.data) return <ErrorState title="Not found" description={`PO #${poId}`} />;

  const po = query.data;
  const status = po.status;
  const pendingLines = po.lines.filter((l) => Number(l.quantity) > Number(l.quantityReceived));

  const canEdit = status === "DRAFT";
  const canApprove = status === "DRAFT";
  const canSend = status === "DRAFT";
  const canReceive = (status === "SENT" || status === "PARTIAL") && pendingLines.length > 0;
  const canClose = status === "PARTIAL" || status === "RECEIVED";
  const canCancel = status === "DRAFT" || status === "SENT" || status === "PARTIAL";

  const anyPending =
    cancelMutation.isPending || closeMutation.isPending;

  const grnRows: GrnRow[] = po.grns;

  return (
    <PageWrapper
      title={po.poNumber}
      subtitle={`${po.vendor?.name ?? "Unknown vendor"} · ${formatShortDate(po.orderDate) || "—"}`}
      backHref="/inventory/purchase-orders"
      actions={
        canEdit || canApprove || canSend || canReceive || canClose || canCancel || po.vendor ? (
          <div className="flex items-center gap-2 flex-wrap">
            {po.vendor && (
              <VendorAiActions vendorId={po.vendor.id} vendorName={po.vendor.name} />
            )}
            {canEdit && (
              <Button size="sm" variant="outline" onClick={handleOpenEdit}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )}
            {canApprove && (
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={handleApprovePO}
                isPending={approveMutation.isPending}
                loadingText="Approving…"
              >
                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                Approve
              </LoadingButton>
            )}
            {canSend && (
              <LoadingButton
                size="sm"
                onClick={handleSendPO}
                isPending={sendMutation.isPending}
                loadingText="Sending…"
              >
                Send PO
              </LoadingButton>
            )}
            {canReceive && (
              <Button size="sm" variant="outline" onClick={handleOpenReceive}>
                <PackageCheck className="mr-1 h-3.5 w-3.5" />
                Receive goods
              </Button>
            )}
            {canClose && (
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={handleRequestClose}
                isPending={closeMutation.isPending}
                loadingText="Closing…"
                disabled={anyPending}
              >
                Close PO
              </LoadingButton>
            )}
            {canCancel && (
              <LoadingButton
                size="sm"
                variant="outline"
                onClick={handleRequestCancel}
                isPending={cancelMutation.isPending}
                loadingText="Cancelling…"
                disabled={anyPending}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <XCircle className="mr-1 h-3.5 w-3.5" />
                Cancel
              </LoadingButton>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Card className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd><StatusBadge status={po.status} /></dd>
            <dt className="text-muted-foreground">Vendor</dt>
            <dd>
              {po.vendor ? (
                <Link
                  href={`/inventory/vendors/${po.vendor.id}`}
                  className="text-primary hover:underline transition-colors"
                >
                  {po.vendor.name}
                </Link>
              ) : "—"}
            </dd>
            <dt className="text-muted-foreground">Order date</dt>
            <dd className="font-mono tabular-nums text-label">{formatShortDate(po.orderDate) || "—"}</dd>
            <dt className="text-muted-foreground">Expected delivery</dt>
            <dd className="font-mono tabular-nums text-label">{formatShortDate(po.expectedDeliveryDate) || "—"}</dd>
            <dt className="text-muted-foreground">Warehouse</dt>
            <dd>{po.warehouse?.name ?? "—"}</dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{po.currency}</dd>
            {po.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="col-span-3">{po.notes}</dd>
              </>
            )}
          </dl>
        </Card>

        <DataTable
          data={po.lines}
          columns={PO_LINE_COLUMNS}
          getRowKey={(row) => row.id}
          minWidth="520px"
        />

        <Card className="p-4">
          <div className="flex justify-end">
            <div className="space-y-1 text-label w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono tabular-nums">{formatAmount(po.subtotal)}</span>
              </div>
              {Number(po.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono tabular-nums">{formatAmount(po.taxAmount)}</span>
                </div>
              )}
              {Number(po.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-mono tabular-nums">−{formatAmount(po.discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-1 flex justify-between font-medium text-sm">
                <span>Total</span>
                <span className="font-mono tabular-nums">
                  {po.currency} {formatAmount(po.total)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {po.grns.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Goods Receipt Notes</h2>
            <DataTable
              data={grnRows}
              columns={grnColumns}
              getRowKey={(row) => row.id}
              onRowClick={handleGrnTableRowClick}
              minWidth="520px"
            />
          </div>
        )}
      </div>

      {canEdit && (
        <PoEditSheet open={editSheetOpen} onOpenChange={setEditSheetOpen} po={po} />
      )}

      {canReceive && (
        <ReceiveGoodsSheet open={receiveSheetOpen} onOpenChange={setReceiveSheetOpen} po={po} />
      )}

      {selectedGrnId !== null && (
        <GrnDetailSheet
          grnId={selectedGrnId}
          open={selectedGrnId !== null}
          onOpenChange={handleGrnDetailOpenChange}
        />
      )}

      <AlertDialog
        open={confirmAction === "cancel"}
        onOpenChange={handleCancelDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel PO {po.poNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissConfirm}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmAction === "close"}
        onOpenChange={handleCloseDialogOpenChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close purchase order?</AlertDialogTitle>
            <AlertDialogDescription>
              Mark this PO as closed? No more receipts will be allowed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDismissConfirm}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClose}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Closing…" : "Yes, close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
