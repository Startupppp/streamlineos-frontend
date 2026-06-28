"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, Truck, FileText } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import {
  useSalesOrder,
  useSoAtp,
  useConfirmSalesOrder,
  useShipSalesOrder,
  useInvoiceSalesOrder,
  type SalesOrderStatus,
  type AtpEntry,
} from "@/lib/api/hooks/inventory/sales-orders";

type SoStatus = SalesOrderStatus;

interface SalesOrderDetailPageProps {
  params: Promise<{ soId: string }>;
}

const STATUS_VARIANT: Record<SoStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  CONFIRMED: "default",
  SHIPPED: "outline",
  INVOICED: "default",
  CANCELLED: "destructive",
};

const STATUS_CLASS: Record<SoStatus, string> = {
  DRAFT: "",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-yellow-100 text-yellow-800 border-yellow-200",
  INVOICED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatNum(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(2);
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
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-1.5 py-0.5">
        <span className="size-1.5 rounded-full bg-yellow-500 inline-block" />
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

export default function SalesOrderDetailPage({ params }: SalesOrderDetailPageProps) {
  const { soId } = use(params);
  const id = Number(soId);

  const query = useSalesOrder(id);
  const atpQuery = useSoAtp(id);
  const confirmMutation = useConfirmSalesOrder();
  const shipMutation = useShipSalesOrder();
  const invoiceMutation = useInvoiceSalesOrder();

  const so = query.data;
  const atpData = atpQuery.data ?? [];

  function getAtp(productId: number): AtpEntry | undefined {
    return atpData.find((a) => a.productId === productId);
  }

  function handleConfirm(): void {
    confirmMutation.mutate(
      { soId: id },
      {
        onSuccess: () => toast.success("Order confirmed"),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  }

  function handleShip(): void {
    if (!so) return;
    const shippedLines = so.lines.map((ln) => ({
      productId: ln.productId,
      shippedQty: Number(ln.quantity),
    }));
    shipMutation.mutate(
      { soId: id, shippedLines },
      {
        onSuccess: () => toast.success("Order shipped"),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  }

  function handleInvoice(): void {
    invoiceMutation.mutate(
      { soId: id },
      {
        onSuccess: () => toast.success("Invoice generated"),
        onError: (err: Error) => toast.error(err.message),
      }
    );
  }

  function handleRetry() { void query.refetch(); }

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={query.error.message} onRetry={handleRetry} />;
  if (!so) return <ErrorState title="Not found" description={`Sales order #${soId} not found`} />;

  const canConfirm = so.status === "DRAFT";
  const canShip = so.status === "CONFIRMED";
  const canInvoice = so.status === "SHIPPED";
  const isMutating = confirmMutation.isPending || shipMutation.isPending || invoiceMutation.isPending;

  return (
    <PageWrapper
      eyebrow="Inventory · Sales Orders"
      title={so.soNumber}
      subtitle={`${so.customerName ?? "Unknown customer"} · ${formatDate(so.orderDate)}`}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          {canConfirm && (
            <Button size="sm" onClick={handleConfirm} disabled={isMutating}>
              <CheckCircle className="mr-1 size-4" />
              {confirmMutation.isPending ? "Confirming…" : "Confirm Order"}
            </Button>
          )}
          {canShip && (
            <Button size="sm" onClick={handleShip} disabled={isMutating}>
              <Truck className="mr-1 size-4" />
              {shipMutation.isPending ? "Shipping…" : "Ship Order"}
            </Button>
          )}
          {canInvoice && (
            <Button size="sm" onClick={handleInvoice} disabled={isMutating}>
              <FileText className="mr-1 size-4" />
              {invoiceMutation.isPending ? "Generating…" : "Generate Invoice"}
            </Button>
          )}
          {so.invoiceId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/billing/invoices/${so.invoiceId}`}>
                <FileText className="mr-1 size-4" />
                View Invoice {so.invoiceNumber ? `(${so.invoiceNumber})` : ""}
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory/sales-orders">
              <ChevronLeft className="mr-1 size-4" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge
                variant={STATUS_VARIANT[so.status]}
                className={STATUS_CLASS[so.status] || undefined}
              >
                {so.status}
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
            <dd className="tabular-nums font-medium">{formatNum(so.total)}</dd>
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

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax %</TableHead>
                  <TableHead className="text-right">Disc %</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                  <TableHead>ATP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {so.lines.map((ln) => {
                  const atp = getAtp(ln.productId);
                  return (
                    <TableRow key={ln.id}>
                      <TableCell>{ln.productName ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{ln.productSku ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNum(ln.quantity)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNum(ln.unitPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {ln.taxRate ? `${formatNum(ln.taxRate)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {ln.discount ? `${formatNum(ln.discount)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNum(ln.lineTotal)}</TableCell>
                      <TableCell>
                        {atp ? (
                          <AtpIndicator available={atp.available} requested={Number(ln.quantity)} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm tabular-nums">
            <div />
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatNum(so.subtotal)}</span>
              </div>
              <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                <span>Total</span>
                <span>{formatNum(so.total)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </PageWrapper>
  );
}
