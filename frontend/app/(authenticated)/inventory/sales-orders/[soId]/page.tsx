"use client";

import { use, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import { SO_STATUS_BADGE, SO_STATUS_LABEL } from "@/features/inventory/lib";
import {
  FulfillmentStepper,
  formatNum,
  buildSoLineColumns,
  type SoStatus,
} from "./so-detail-helpers";
import { PickSheet } from "@/features/inventory/components/sales/pick-sheet";
import { ShipSheet } from "@/features/inventory/components/sales/ship-sheet";
import { SoEditSheet } from "@/features/inventory/components/sales/so-edit-sheet";
import {
  useSalesOrder,
  useSoAtp,
  useConfirmSalesOrder,
  useReserveSalesOrder,
  usePackSalesOrder,
  useInvoiceSalesOrder,
  useCancelSalesOrder,
} from "@/hooks/api/inventory/sales-orders";

interface SalesOrderDetailPageProps {
  params: Promise<{ soId: string }>;
}

export default function SalesOrderDetailPage({ params }: SalesOrderDetailPageProps) {
  const { soId } = use(params);
  const id = Number(soId);

  const [showPickSheet, setShowPickSheet] = useState(false);
  const [showShipSheet, setShowShipSheet] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPackDialog, setShowPackDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const query = useSalesOrder(id);
  const atpQuery = useSoAtp(id);
  const confirmMutation = useConfirmSalesOrder();
  const reserveMutation = useReserveSalesOrder();
  const packMutation = usePackSalesOrder();
  const invoiceMutation = useInvoiceSalesOrder();
  const cancelMutation = useCancelSalesOrder();

  const canUpdate = useCan("inventory:sales-orders:update");
  const canConfirm = useCan("inventory:sales-orders:confirm");
  const canShip = useCan("inventory:sales-orders:ship");
  const canInvoice = useCan("inventory:sales-orders:invoice");

  const so = query.data;
  const atpData = atpQuery.data ?? [];

  const lineColumns = buildSoLineColumns(atpData);

  function handleConfirm(): void {
    confirmMutation.mutate({ soId: id }, {
      onSuccess: () => toast.success("Order confirmed"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleReserve(): void {
    reserveMutation.mutate({ soId: id }, {
      onSuccess: (data) => {
        if (data.shortfalls?.length) {
          toast.warning(`Partially reserved — ${data.shortfalls.length} lines have insufficient stock`);
        } else {
          toast.success("Order reserved");
        }
      },
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handlePackConfirm(): void {
    packMutation.mutate({ soId: id }, {
      onSuccess: () => { setShowPackDialog(false); toast.success("Order packed"); },
      onError: (err) => { toast.error(getErrorMessage(err)); },
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(
      { soId: id, reason: cancelReason.trim() || undefined },
      {
        onSuccess: () => { setShowCancelDialog(false); toast.success("Order cancelled"); },
        onError: (err) => { toast.error(getErrorMessage(err)); },
      },
    );
  }

  function handleInvoice(): void {
    invoiceMutation.mutate({ soId: id }, {
      onSuccess: () => toast.success("Invoice generated"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRetry(): void { void query.refetch(); }
  function handleOpenPickSheet(): void { setShowPickSheet(true); }
  function handleOpenShipSheet(): void { setShowShipSheet(true); }
  function handleOpenEditSheet(): void { setShowEditSheet(true); }
  function handleOpenPackDialog(): void { setShowPackDialog(true); }
  function handleOpenCancelDialog(): void { setShowCancelDialog(true); }

  function handleCancelDialogOpenChange(open: boolean): void {
    if (!open) setCancelReason("");
    setShowCancelDialog(open);
  }

  function handleCancelReasonChange(e: ChangeEvent<HTMLTextAreaElement>): void {
    setCancelReason(e.target.value);
  }

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={getErrorMessage(query.error)} onRetry={handleRetry} />;
  if (!so)
    return (
      <InventoryEmptyState
        illustrationPreset="orders"
        title="Sales order not found"
        description={`Sales order #${soId} was deleted, or the link is out of date.`}
        action={{ label: "Back to sales orders", href: "/inventory/sales-orders" }}
      />
    );

  const status: SoStatus = so.status;
  const isMutating =
    confirmMutation.isPending || reserveMutation.isPending ||
    packMutation.isPending || cancelMutation.isPending || invoiceMutation.isPending;

  return (
    <PageWrapper
      title={so.soNumber}
      subtitle={`${so.customerName ?? "Unknown customer"} · ${formatShortDate(so.orderDate) || "—"}`}
      backHref="/inventory/sales-orders"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <Card className="p-4">
          <FulfillmentStepper status={status} />
          <div className="mt-3 flex items-center justify-end gap-2 flex-wrap">
            {status === "DRAFT" && (
              <>
                {canUpdate && (
                  <Button size="sm" variant="outline" onClick={handleOpenEditSheet}>
                    <Pencil className="mr-1 size-3.5" />
                    Edit
                  </Button>
                )}
                {canConfirm && (
                  <LoadingButton size="sm" onClick={handleConfirm} isPending={confirmMutation.isPending} loadingText="Confirming…" disabled={isMutating}>
                    Confirm
                  </LoadingButton>
                )}
                {canUpdate && (
                  <Button size="sm" variant="ghost" onClick={handleOpenCancelDialog} disabled={isMutating}>
                    Cancel Order
                  </Button>
                )}
              </>
            )}
            {status === "CONFIRMED" && (
              <>
                {canConfirm && (
                  <LoadingButton size="sm" onClick={handleReserve} isPending={reserveMutation.isPending} loadingText="Reserving…" disabled={isMutating}>
                    Reserve
                  </LoadingButton>
                )}
                {canUpdate && (
                  <Button size="sm" variant="ghost" onClick={handleOpenCancelDialog} disabled={isMutating}>
                    Cancel Order
                  </Button>
                )}
              </>
            )}
            {status === "PARTIALLY_RESERVED" && (
              <>
                {canConfirm && (
                  <LoadingButton size="sm" variant="outline" onClick={handleReserve} isPending={reserveMutation.isPending} loadingText="Reserving…" disabled={isMutating}>
                    Reserve Again
                  </LoadingButton>
                )}
                {canShip && (
                  <Button size="sm" onClick={handleOpenPickSheet}>Pick</Button>
                )}
              </>
            )}
            {status === "RESERVED" && canShip && (
              <Button size="sm" onClick={handleOpenPickSheet}>Pick</Button>
            )}
            {status === "PICKED" && (
              <>
                {canShip && (
                  <LoadingButton size="sm" onClick={handleOpenPackDialog} isPending={packMutation.isPending} loadingText="Packing…" disabled={isMutating}>
                    Pack
                  </LoadingButton>
                )}
                {canUpdate && (
                  <Button size="sm" variant="ghost" onClick={handleOpenCancelDialog} disabled={isMutating}>
                    Cancel Order
                  </Button>
                )}
              </>
            )}
            {status === "PACKED" && (
              <>
                {canShip && (
                  <Button size="sm" onClick={handleOpenShipSheet}>Ship</Button>
                )}
                {canUpdate && (
                  <Button size="sm" variant="ghost" onClick={handleOpenCancelDialog} disabled={isMutating}>
                    Cancel Order
                  </Button>
                )}
              </>
            )}
            {status === "PARTIALLY_SHIPPED" && canShip && (
              <Button size="sm" onClick={handleOpenShipSheet}>Ship Remaining</Button>
            )}
            {status === "SHIPPED" && canInvoice && (
              <LoadingButton size="sm" onClick={handleInvoice} isPending={invoiceMutation.isPending} loadingText="Invoicing…" disabled={isMutating}>
                Invoice
              </LoadingButton>
            )}
            {so.invoiceId && (
              <Button size="sm" variant="outline" asChild>
                <Link href={`/billing/invoices/${so.invoiceId}`}>
                  <FileText className="mr-1 size-3.5" />
                  {so.invoiceNumber ? `Invoice ${so.invoiceNumber}` : "View Invoice"}
                </Link>
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant="outline" className={`h-5 text-micro px-2 py-0.5 ${SO_STATUS_BADGE[status]}`}>
                {SO_STATUS_LABEL[status]}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{so.customerName ?? "—"}</dd>
            <dt className="text-muted-foreground">Order Date</dt>
            <dd>{formatShortDate(so.orderDate) || "—"}</dd>
            <dt className="text-muted-foreground">Required Date</dt>
            <dd>{formatShortDate(so.expectedShipDate) || "—"}</dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{so.currency ?? "—"}</dd>
            <dt className="text-muted-foreground">Total</dt>
            <dd className="font-mono tabular-nums font-medium">{formatNum(so.total)}</dd>
            {so.shippingAddress && (
              <>
                <dt className="text-muted-foreground">Shipping Address</dt>
                <dd className="col-span-3 whitespace-pre-line">{so.shippingAddress}</dd>
              </>
            )}
            {so.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="col-span-3">{so.notes}</dd>
              </>
            )}
          </dl>
        </Card>

        <DataTable
          data={so.lines}
          columns={lineColumns}
          getRowKey={(row) => row.id}
          emptyState={
            <InventoryEmptyState
              compact
              illustrationPreset="inventory"
              title="No lines on this order"
              description="Nothing has been ordered yet. Edit the order to add products."
            />
          }
          minWidth="700px"
        />

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatNum(so.subtotal)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                <span>Total</span>
                <span className="font-mono tabular-nums">{formatNum(so.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={handleCancelDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel sales order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={handleCancelReasonChange}
            placeholder="Reason (optional)"
            className="text-sm min-h-[80px] resize-none mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <LoadingButton
              size="sm"
              variant="destructive"
              isPending={cancelMutation.isPending}
              loadingText="Cancelling…"
              onClick={handleCancelConfirm}
            >
              Cancel Order
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showPackDialog} onOpenChange={setShowPackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pack order?</AlertDialogTitle>
            <AlertDialogDescription>Confirm packing is complete.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <LoadingButton size="sm" isPending={packMutation.isPending} loadingText="Packing…" onClick={handlePackConfirm}>
              Confirm Pack
            </LoadingButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PickSheet
        open={showPickSheet}
        onOpenChange={setShowPickSheet}
        soId={id}
        lines={so.lines.map((l) => ({ id: l.id, productName: l.productName, quantity: l.quantity }))}
      />
      <ShipSheet open={showShipSheet} onOpenChange={setShowShipSheet} soId={id} />
      <SoEditSheet
        open={showEditSheet}
        onOpenChange={setShowEditSheet}
        soId={id}
        so={so}
      />
    </PageWrapper>
  );
}
