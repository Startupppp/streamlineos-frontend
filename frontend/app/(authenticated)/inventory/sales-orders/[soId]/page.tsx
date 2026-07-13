"use client";

import { use, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Check, FileText, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LoadingState, ErrorState } from "@/components/shared";
import { useCan } from "@/hooks/api/access";
import { SO_STATUS_BADGE, SO_STATUS_LABEL, type SoStatus } from "@/features/inventory/lib";
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
  type AtpEntry,
} from "@/hooks/api/inventory/sales-orders";

interface SalesOrderDetailPageProps {
  params: Promise<{ soId: string }>;
}

const STEP_LABELS = ["Draft", "Confirmed", "Reserved", "Picked", "Packed", "Shipped", "Invoiced"];

const STATUS_STEP: Record<SoStatus, number> = {
  DRAFT: 0, CONFIRMED: 1, PARTIALLY_RESERVED: 2, RESERVED: 2,
  PICKED: 3, PACKED: 4, PARTIALLY_SHIPPED: 5, SHIPPED: 5,
  INVOICED: 6, CLOSED: 6, CANCELLED: -1,
};

type StepState = "completed" | "active" | "future";

const STEP_CLS: Record<StepState, string> = {
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  active: "bg-amber-100 text-amber-700 border-amber-200 font-medium",
  future: "bg-muted text-muted-foreground border-border",
};

function FulfillmentStepper({ status }: { status: SoStatus }) {
  if (status === "CANCELLED") {
    return (
      <span className="text-[10px] px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
        Cancelled
      </span>
    );
  }
  const active = STATUS_STEP[status];
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {STEP_LABELS.map((label, idx) => {
        const state: StepState = idx < active ? "completed" : idx === active ? "active" : "future";
        return (
          <span
            key={label}
            className={`text-[10px] px-2 py-0.5 rounded border inline-flex items-center gap-1 ${STEP_CLS[state]}`}
          >
            {state === "completed" && <Check className="size-2.5" />}
            {label}
          </span>
        );
      })}
    </div>
  );
}

function AtpIndicator({ available, requested }: { available: number; requested: number }) {
  if (available >= requested) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-green-500 inline-block" />
        In stock
      </span>
    );
  }
  if (available > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-amber-500 inline-block" />
        Partial ({available})
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
      <span className="size-1.5 rounded-full bg-red-500 inline-block" />
      Insufficient
    </span>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatNum(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(2);
}

type SoLine = {
  id: number;
  productId: number;
  productName?: string | null;
  productSku?: string | null;
  quantity: string | number;
  unitPrice?: string | number | null;
  taxRate?: string | number | null;
  discount?: string | number | null;
  lineTotal?: string | number | null;
};

function buildSoLineColumns(atpData: AtpEntry[]): DataTableColumn<SoLine>[] {
  return [
    {
      key: "productName",
      header: "Product",
      cell: (row) => <span>{row.productName ?? "—"}</span>,
    },
    {
      key: "productSku",
      header: "SKU",
      className: "font-mono",
      cell: (row) => <span>{row.productSku ?? "—"}</span>,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.quantity)}</span>,
    },
    {
      key: "unitPrice",
      header: "Unit Price",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.unitPrice)}</span>,
    },
    {
      key: "taxRate",
      header: "Tax %",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.taxRate ? `${formatNum(row.taxRate)}%` : "—"}</span>,
    },
    {
      key: "discount",
      header: "Disc %",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{row.discount ? `${formatNum(row.discount)}%` : "—"}</span>,
    },
    {
      key: "lineTotal",
      header: "Line Total",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (row) => <span>{formatNum(row.lineTotal)}</span>,
    },
    {
      key: "atp",
      header: "ATP",
      cell: (row) => {
        const atp = atpData.find((a) => a.productId === row.productId);
        return atp ? (
          <AtpIndicator available={atp.available} requested={Number(row.quantity)} />
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
  ];
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
      onError: (err) => toast.error(err.message),
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
      onError: (err) => toast.error(err.message),
    });
  }

  function handlePackConfirm(): void {
    packMutation.mutate({ soId: id }, {
      onSuccess: () => { setShowPackDialog(false); toast.success("Order packed"); },
      onError: (err) => { toast.error(err.message); },
    });
  }

  function handleCancelConfirm(): void {
    cancelMutation.mutate(
      { soId: id, reason: cancelReason.trim() || undefined },
      {
        onSuccess: () => { setShowCancelDialog(false); toast.success("Order cancelled"); },
        onError: (err) => { toast.error(err.message); },
      },
    );
  }

  function handleInvoice(): void {
    invoiceMutation.mutate({ soId: id }, {
      onSuccess: () => toast.success("Invoice generated"),
      onError: (err) => toast.error(err.message),
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
  if (query.error) return <ErrorState description={query.error.message} onRetry={handleRetry} />;
  if (!so) return <ErrorState title="Not found" description={`Sales order #${soId} not found`} />;

  const status: SoStatus = so.status;
  const isMutating =
    confirmMutation.isPending || reserveMutation.isPending ||
    packMutation.isPending || cancelMutation.isPending || invoiceMutation.isPending;

  return (
    <PageWrapper
      eyebrow="Inventory / Sales Orders"
      title={so.soNumber}
      subtitle={`${so.customerName ?? "Unknown customer"} · ${formatDate(so.orderDate)}`}
      backHref="/inventory/sales-orders"
    >
      <div className="space-y-4">
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
                  <Button size="sm" onClick={handleConfirm} disabled={isMutating}>
                    {confirmMutation.isPending ? "Confirming…" : "Confirm"}
                  </Button>
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
                  <Button size="sm" onClick={handleReserve} disabled={isMutating}>
                    {reserveMutation.isPending ? "Reserving…" : "Reserve"}
                  </Button>
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
                  <Button size="sm" variant="outline" onClick={handleReserve} disabled={isMutating}>
                    Reserve Again
                  </Button>
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
                  <Button size="sm" onClick={handleOpenPackDialog} disabled={isMutating}>
                    {packMutation.isPending ? "Packing…" : "Pack"}
                  </Button>
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
              <Button size="sm" onClick={handleInvoice} disabled={isMutating}>
                {invoiceMutation.isPending ? "Invoicing…" : "Invoice"}
              </Button>
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
              <Badge variant="outline" className={`h-5 text-[10px] px-2 py-0.5 ${SO_STATUS_BADGE[status]}`}>
                {SO_STATUS_LABEL[status]}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{so.customerName ?? "—"}</dd>
            <dt className="text-muted-foreground">Order Date</dt>
            <dd>{formatDate(so.orderDate)}</dd>
            <dt className="text-muted-foreground">Required Date</dt>
            <dd>{formatDate(so.expectedShipDate)}</dd>
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
            <Button
              size="sm"
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending ? "Cancelling…" : "Cancel Order"}
            </Button>
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
            <Button size="sm" disabled={packMutation.isPending} onClick={handlePackConfirm}>
              {packMutation.isPending ? "Packing…" : "Confirm Pack"}
            </Button>
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
