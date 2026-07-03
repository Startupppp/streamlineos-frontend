"use client";

import { use, useState } from "react";
import Link from "next/link";
import { Send, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const STATUS_BADGE: Record<PurchaseOrderStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  SENT: "bg-blue-50 text-blue-700 border-blue-200",
  PARTIAL: "bg-amber-50 text-amber-700 border-amber-200",
  RECEIVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-700 border-slate-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
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
  return (
    <Badge variant="outline" className={cn("h-4 text-[9px] px-1.5 py-0", STATUS_BADGE[status])}>
      {status}
    </Badge>
  );
}

function PurchaseOrderLines({ lines }: { lines: PurchaseOrderLine[] }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
          <TableRow className="border-b-2 border-border">
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Product</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">SKU</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Qty</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Unit cost</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Received</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.id} className="h-8 hover:bg-muted/30 transition-colors">
              <TableCell className="px-2 py-1 text-[11px]">
                {line.productVariant?.product?.name ?? line.productVariant?.name ?? "—"}
              </TableCell>
              <TableCell className="px-2 py-1 font-mono text-[11px]">
                {line.productVariant?.sku ?? "—"}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                {formatAmount(line.quantity)}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                {formatAmount(line.unitCost)}
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px]">
                <span
                  className={
                    Number(line.quantityReceived) >= Number(line.quantity)
                      ? "text-emerald-600 font-medium"
                      : Number(line.quantityReceived) > 0
                        ? "text-amber-600 font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {formatAmount(line.quantityReceived)}
                </span>
              </TableCell>
              <TableCell className="px-2 py-1 text-right font-mono tabular-nums text-[11px] font-medium">
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
      eyebrow="Inventory / Purchase Orders"
      title={po.poNumber}
      subtitle={`${po.vendor?.name ?? "Unknown vendor"} · ${formatDate(po.orderDate)}`}
      backHref="/inventory/purchase-orders"
      actions={
        canSend || (canReceive && pendingLines.length > 0) ? (
          <>
            {canSend && (
              <Button size="sm" onClick={handleSendPO} disabled={sendMutation.isPending}>
                <Send className="mr-1 h-3.5 w-3.5" />
                {sendMutation.isPending ? "Sending…" : "Send PO"}
              </Button>
            )}
            {canReceive && pendingLines.length > 0 && (
              <Button size="sm" variant="outline" onClick={handleOpenReceive}>
                <PackageCheck className="mr-1 h-3.5 w-3.5" />
                Receive goods
              </Button>
            )}
          </>
        ) : undefined
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
                <Link href={`/inventory/vendors/${po.vendor.id}`} className="text-blue-600 hover:underline transition-colors">
                  {po.vendor.name}
                </Link>
              ) : "—"}
            </dd>
            <dt className="text-muted-foreground">Order date</dt>
            <dd className="font-mono tabular-nums text-[13px]">{formatDate(po.orderDate)}</dd>
            <dt className="text-muted-foreground">Expected delivery</dt>
            <dd className="font-mono tabular-nums text-[13px]">{formatDate(po.expectedDeliveryDate)}</dd>
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
            <div className="space-y-1 text-[13px] w-64">
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
                <span className="font-mono tabular-nums">{po.currency} {formatAmount(po.total)}</span>
              </div>
            </div>
          </div>
        </Card>

        {po.grns.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Goods Receipt Notes</h2>
            <Card className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="border-b-2 border-border">
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">GRN #</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Received date</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Received by</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {po.grns.map((grn) => (
                    <TableRow key={grn.id} className="h-8 hover:bg-muted/30 transition-colors">
                      <TableCell className="px-2 py-1 font-mono text-[11px]">{grn.grnNumber}</TableCell>
                      <TableCell className="px-2 py-1 font-mono tabular-nums text-[11px]">{formatDate(grn.receivedDate)}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px]">{grn.creator?.name ?? "—"}</TableCell>
                      <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{grn.notes ?? "—"}</TableCell>
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
