"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Send, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { usePurchaseOrder, useSendPurchaseOrder } from "@/hooks/api/inventory";
import { ReceiveGoodsSheet } from "@/features/inventory/components/receive-goods-sheet";
import type { PurchaseOrderLine, PurchaseOrderStatus } from "@/types/inventory";

interface PoDetailPageProps {
  params: Promise<{ poId: string }>;
}

const STATUS_VARIANT: Record<PurchaseOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "default",
  PARTIAL: "outline",
  RECEIVED: "default",
  CLOSED: "secondary",
  CANCELLED: "destructive",
};

const STATUS_CLASS: Partial<Record<PurchaseOrderStatus, string>> = {
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-yellow-50 text-yellow-700 border-yellow-200",
  RECEIVED: "bg-green-50 text-green-700 border-green-200",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

function formatAmount(value: string): string {
  return Number(value).toFixed(2);
}

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const extraClass = STATUS_CLASS[status];
  return (
    <Badge variant={STATUS_VARIANT[status]} className={extraClass}>
      {status}
    </Badge>
  );
}

function PurchaseOrderLines({ lines }: { lines: PurchaseOrderLine[] }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit cost</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell className="text-sm">
                {line.productVariant?.product?.name ?? line.productVariant?.name ?? "—"}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {line.productVariant?.sku ?? "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatAmount(line.quantity)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                {formatAmount(line.unitCost)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm">
                <span
                  className={
                    Number(line.quantityReceived) >= Number(line.quantity)
                      ? "text-green-600 font-medium"
                      : Number(line.quantityReceived) > 0
                        ? "text-yellow-600 font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {formatAmount(line.quantityReceived)}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-sm font-medium">
                {formatAmount(line.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export default function PurchaseOrderDetailPage({ params }: PoDetailPageProps) {
  const { poId } = use(params);
  const id = Number(poId);
  const query = usePurchaseOrder(id);
  const sendMutation = useSendPurchaseOrder(id);
  const [receiveSheetOpen, setReceiveSheetOpen] = useState<boolean>(false);

  function handleRetry(): void {
    void query.refetch();
  }

  function handleSendPO(): void {
    sendMutation.mutate(undefined, {
      onSuccess: (result) => toast.success(`PO ${result.poNumber} sent`),
      onError: (error) => toast.error(error.message),
    });
  }

  function handleOpenReceive(): void {
    setReceiveSheetOpen(true);
  }

  if (query.isLoading) return <LoadingState variant="form" />;
  if (query.error) return <ErrorState description={query.error.message} onRetry={handleRetry} />;
  if (!query.data) return <ErrorState title="Not found" description={`PO #${poId}`} />;

  const po = query.data;
  const canSend = po.status === "DRAFT";
  const canReceive = po.status === "SENT" || po.status === "PARTIAL";
  const pendingLines = po.lines.filter((l) => Number(l.quantity) > Number(l.quantityReceived));

  return (
    <PageWrapper
      eyebrow="Inventory · Purchase Orders"
      title={po.poNumber}
      subtitle={`${po.vendor?.name ?? "Unknown vendor"} · ${formatDate(po.orderDate)}`}
      actions={
        <div className="flex items-center gap-2">
          {canSend && (
            <Button size="sm" onClick={handleSendPO} disabled={sendMutation.isPending}>
              <Send className="mr-1 h-4 w-4" />
              {sendMutation.isPending ? "Sending…" : "Send PO"}
            </Button>
          )}
          {canReceive && pendingLines.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleOpenReceive}>
              <PackageCheck className="mr-1 h-4 w-4" />
              Receive goods
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory/purchase-orders">
              <ChevronLeft className="mr-1 h-4 w-4" />
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
            <dd><StatusBadge status={po.status} /></dd>
            <dt className="text-muted-foreground">Vendor</dt>
            <dd>
              {po.vendor ? (
                <Link href={`/inventory/vendors/${po.vendor.id}`} className="hover:text-blue-600 hover:underline">
                  {po.vendor.name}
                </Link>
              ) : "—"}
            </dd>
            <dt className="text-muted-foreground">Order date</dt>
            <dd>{formatDate(po.orderDate)}</dd>
            <dt className="text-muted-foreground">Expected delivery</dt>
            <dd>{formatDate(po.expectedDeliveryDate)}</dd>
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

        <PurchaseOrderLines lines={po.lines} />

        <Card className="p-4">
          <div className="flex justify-end">
            <div className="space-y-1 text-sm tabular-nums w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatAmount(po.subtotal)}</span>
              </div>
              {Number(po.taxAmount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatAmount(po.taxAmount)}</span>
                </div>
              )}
              {Number(po.discount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>−{formatAmount(po.discount)}</span>
                </div>
              )}
              <div className="border-t border-border pt-1 flex justify-between font-medium text-base">
                <span>Total</span>
                <span>{po.currency} {formatAmount(po.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {po.grns.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Goods Receipt Notes</h2>
            <Card className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN #</TableHead>
                    <TableHead>Received date</TableHead>
                    <TableHead>Received by</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.grns.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-mono text-xs">{grn.grnNumber}</TableCell>
                      <TableCell className="text-sm">{formatDate(grn.receivedDate)}</TableCell>
                      <TableCell className="text-sm">{grn.creator?.name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{grn.notes ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </div>

      {canReceive && pendingLines.length > 0 && (
        <ReceiveGoodsSheet open={receiveSheetOpen} onOpenChange={setReceiveSheetOpen} po={po} />
      )}
    </PageWrapper>
  );
}
