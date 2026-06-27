"use client";

import { use } from "react";
import Link from "next/link";
import { ChevronLeft, Package } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState, ErrorState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useVendor, useVendorPurchaseOrders } from "@/lib/api/hooks/inventory";
import type { PurchaseOrderStatus } from "@/types/inventory";

interface VendorDetailPageProps {
  params: Promise<{ vendorId: string }>;
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

function StatusBadge({ status }: { status: PurchaseOrderStatus }) {
  const extraClass = STATUS_CLASS[status];
  return (
    <Badge variant={STATUS_VARIANT[status]} className={extraClass}>
      {status}
    </Badge>
  );
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const { vendorId } = use(params);
  const id = Number(vendorId);

  const vendorQuery = useVendor(id);
  const posQuery = useVendorPurchaseOrders(id);

  if (vendorQuery.isLoading) return <LoadingState variant="form" />;
  if (vendorQuery.error) return <ErrorState description={vendorQuery.error.message} />;
  if (!vendorQuery.data) return <ErrorState title="Not found" description={`Vendor #${vendorId}`} />;

  const vendor = vendorQuery.data;
  const poItems = posQuery.data?.items ?? [];

  return (
    <PageWrapper
      eyebrow="Inventory · Vendors"
      title={vendor.name}
      subtitle={`${vendor.code} · ${vendor.currency}`}
      actions={
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inventory/vendors">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="p-4">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <Badge variant={vendor.isActive ? "default" : "secondary"}>
                {vendor.isActive ? "Active" : "Inactive"}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">Code</dt>
            <dd className="font-mono text-xs">{vendor.code}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{vendor.email ?? "—"}</dd>
            <dt className="text-muted-foreground">Phone</dt>
            <dd>{vendor.phone ?? "—"}</dd>
            <dt className="text-muted-foreground">GSTIN</dt>
            <dd className="font-mono text-xs">{vendor.gstin ?? "—"}</dd>
            <dt className="text-muted-foreground">Currency</dt>
            <dd>{vendor.currency}</dd>
            <dt className="text-muted-foreground">Lead time</dt>
            <dd>{vendor.leadTimeDays} days</dd>
            <dt className="text-muted-foreground">Payment terms</dt>
            <dd>Net {vendor.paymentTermsDays}</dd>
            {vendor.address && (
              <>
                <dt className="text-muted-foreground">Address</dt>
                <dd className="col-span-3 whitespace-pre-line">{vendor.address}</dd>
              </>
            )}
            {vendor.notes && (
              <>
                <dt className="text-muted-foreground">Notes</dt>
                <dd className="col-span-3">{vendor.notes}</dd>
              </>
            )}
          </dl>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Purchase Orders</h2>
            <Button size="sm" asChild>
              <Link href={`/inventory/purchase-orders/new?vendorId=${vendor.id}`}>
                New PO
              </Link>
            </Button>
          </div>

          {posQuery.isLoading && <LoadingState variant="table" rows={4} />}
          {posQuery.error && <ErrorState description={posQuery.error.message} />}

          {!posQuery.isLoading && !posQuery.error && poItems.length === 0 && (
            <EmptyState
              illustration={<Package className="h-12 w-12 text-muted-foreground/40" />}
              title="No purchase orders"
              description="Create a purchase order for this vendor."
              action={{ label: "New PO", href: `/inventory/purchase-orders/new?vendorId=${vendor.id}` }}
              compact
            />
          )}

          {poItems.length > 0 && (
            <Card className="overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>PO #</TableHead>
                    <TableHead>Order date</TableHead>
                    <TableHead>Expected delivery</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poItems.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/inventory/purchase-orders/${po.id}`}
                          className="text-foreground hover:text-blue-600 hover:underline"
                        >
                          {po.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{formatDate(po.orderDate)}</TableCell>
                      <TableCell>{formatDate(po.expectedDeliveryDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {po.currency} {Number(po.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
